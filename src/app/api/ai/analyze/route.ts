import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeRequestSchema } from "@/lib/validation/schemas";
import { AiError, getAiProvider } from "@/lib/ai/provider";
import { buildAnalysisPrompt } from "@/lib/ai/prompt";
import { computeAlignment } from "@/lib/ai/alignment";
import { jobFingerprint, resumeHash } from "@/lib/ai/hash";
import { AI_LIMITS } from "@/config/constants";
import type { StoredAnalysis } from "@/lib/ai/schema";
import type { Job } from "@/types";

export const maxDuration = 60;

const STATUS: Record<string, number> = {
  not_configured: 503,
  rate_limited: 429,
  timeout: 504,
  provider_error: 502,
  invalid_output: 502,
};

function err(status: number, code: string, error: string) {
  return NextResponse.json({ code, error }, { status });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return err(401, "unauthorized", "Please sign in again.");

  const body = analyzeRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return err(400, "bad_request", "Invalid request.");
  const { application_id, force } = body.data;

  // RLS-bound reads: a user who cannot see this application gets "not found".
  const { data: app } = await supabase
    .from("applications")
    .select(
      "id, job_id, job:jobs(id, title, description, requirements), candidate:candidates(id, resume_text, resume_md5)",
    )
    .eq("id", application_id)
    .maybeSingle();
  if (!app) return err(404, "not_found", "Application not found.");

  const job = (Array.isArray(app.job) ? app.job[0] : app.job) as Pick<Job, "id" | "title" | "description" | "requirements"> | null;
  const candidate = (Array.isArray(app.candidate) ? app.candidate[0] : app.candidate) as {
    resume_text: string | null;
    resume_md5: string | null;
  } | null;
  if (!job || !candidate) return err(404, "not_found", "Application not found.");
  if (!candidate.resume_text) {
    return err(422, "missing_resume", "This candidate has no extractable resume text. Upload a text-based PDF or .txt file first.");
  }

  const rHash = resumeHash(candidate.resume_text);
  const jHash = jobFingerprint(job);

  if (!force) {
    const { data: cached } = await supabase
      .from("ai_analyses")
      .select("id, provider, model, result, created_at")
      .eq("application_id", application_id)
      .eq("resume_hash", rHash)
      .eq("job_description_hash", jHash)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (cached) return NextResponse.json({ cached: true, analysis: { ...cached, stale: false } });
  }

  // Abuse control: per-user hourly cap, counted from stored analyses (no extra infrastructure).
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("ai_analyses")
    .select("id", { count: "exact", head: true })
    .eq("created_by", auth.user.id)
    .gte("created_at", since);
  if ((count ?? 0) >= AI_LIMITS.analysesPerHour) {
    return err(429, "rate_limited", `Hourly analysis limit reached (${AI_LIMITS.analysesPerHour}). Try again later.`);
  }

  let provider;
  try {
    provider = getAiProvider();
  } catch (e) {
    const ai = e as AiError;
    return err(STATUS[ai.code] ?? 503, ai.code, ai.message);
  }

  let stored: StoredAnalysis;
  try {
    const prompt = buildAnalysisPrompt(
      {
        title: job.title,
        description: job.description,
        skills: job.requirements?.skills ?? [],
        minExperience: job.requirements?.min_experience_years ?? null,
        notes: job.requirements?.notes ?? "",
      },
      candidate.resume_text,
    );
    const result = await provider.analyze(prompt);
    stored = { ...result, requirements_alignment: computeAlignment(result, job.requirements?.skills ?? []) };
  } catch (e) {
    if (e instanceof AiError) return err(STATUS[e.code] ?? 502, e.code, e.message);
    return err(502, "provider_error", "The analysis could not be completed.");
  }

  // Persisted only after auth + validation; the model never writes to the database itself.
  const { data: row, error } = await supabase
    .from("ai_analyses")
    .insert({
      application_id,
      job_id: job.id,
      provider: provider.name,
      model: provider.model,
      result: stored,
      resume_hash: rHash,
      job_description_hash: jHash,
      created_by: auth.user.id,
    })
    .select("id, provider, model, result, created_at")
    .single();
  if (error || !row) return err(500, "save_failed", "The analysis was generated but could not be saved.");

  return NextResponse.json({ cached: false, analysis: { ...row, stale: false } });
}
