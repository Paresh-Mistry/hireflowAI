import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE, type Stage } from "@/config/constants";
import type { ApplicationSummary, Candidate, CandidateRow } from "@/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface CandidateFilters {
  q?: string;
  stage?: string;
  job?: string;
  location?: string;
  skill?: string;
  from?: string;
  to?: string;
  sort?: string;
  page?: number;
}

const isUuid = (v?: string) => !!v && /^[0-9a-f-]{36}$/i.test(v);
const isDate = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

export async function listCandidates(supabase: Supabase, f: CandidateFilters) {
  const page = Math.max(1, f.page ?? 1);
  const { data, error } = await supabase.rpc("candidate_directory", {
    p_q: f.q || null,
    p_stage: f.stage || null,
    p_job: isUuid(f.job) ? f.job : null,
    p_location: f.location || null,
    p_from: isDate(f.from) ? f.from : null,
    p_to: isDate(f.to) ? f.to : null,
    p_skill: f.skill || null,
    p_sort: f.sort || "recent",
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  if (error) throw new Error("Could not load candidates.");
  const rows = (data ?? []) as CandidateRow[];
  const total = rows[0]?.total_count ?? 0;
  return { rows, total: Number(total), page, pageCount: Math.max(1, Math.ceil(Number(total) / PAGE_SIZE)) };
}

export async function getCandidate(supabase: Supabase, id: string): Promise<(Candidate & { resume_md5: string | null }) | null> {
  if (!isUuid(id)) return null;
  const { data } = await supabase
    .from("candidates")
    .select(
      "id, full_name, email, phone, location, current_title, experience_years, skills, linkedin_url, portfolio_url, resume_path, resume_filename, resume_uploaded_at, resume_md5, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const { resume_md5, ...rest } = data as typeof data & { resume_md5: string | null };
  return { ...(rest as Omit<Candidate, "has_resume_text" | "resume_md5">), has_resume_text: !!resume_md5, resume_md5 };
}

export async function getCandidateApplications(supabase: Supabase, candidateId: string): Promise<ApplicationSummary[]> {
  const { data } = await supabase
    .from("applications")
    .select(
      "id, stage, applied_at, last_stage_changed_at, rejection_reason, job:jobs(id, title, status), analyses:ai_analyses(created_at)",
    )
    .eq("candidate_id", candidateId)
    .order("applied_at", { ascending: false });
  return (data ?? []).map((a) => {
    const job = Array.isArray(a.job) ? a.job[0] : a.job;
    const analyses = (a.analyses ?? []) as { created_at: string }[];
    return {
      id: a.id,
      stage: a.stage as Stage,
      applied_at: a.applied_at,
      last_stage_changed_at: a.last_stage_changed_at,
      rejection_reason: a.rejection_reason,
      job: job as ApplicationSummary["job"],
      latest_analysis_at: analyses.map((x) => x.created_at).sort().at(-1) ?? null,
    };
  });
}

export async function getNotes(supabase: Supabase, applicationId: string) {
  const { data } = await supabase
    .from("candidate_notes")
    .select("id, content, created_at, updated_at, author_id, author:profiles(full_name)")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((n) => ({
    id: n.id as string,
    content: n.content as string,
    created_at: n.created_at as string,
    updated_at: n.updated_at as string,
    author_id: n.author_id as string,
    author_name: ((Array.isArray(n.author) ? n.author[0] : n.author) as { full_name: string } | null)?.full_name ?? "Unknown",
  }));
}

export async function getActivity(supabase: Supabase, applicationId: string) {
  const { data } = await supabase
    .from("activity_logs")
    .select("id, event_type, description, created_at, actor:profiles(full_name)")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []).map((a) => ({
    id: a.id as string,
    event_type: a.event_type as string,
    description: a.description as string,
    created_at: a.created_at as string,
    actor_name: ((Array.isArray(a.actor) ? a.actor[0] : a.actor) as { full_name: string } | null)?.full_name ?? null,
  }));
}

export async function getLatestAnalysis(supabase: Supabase, applicationId: string) {
  const { data } = await supabase
    .from("ai_analyses")
    .select("id, provider, model, result, created_at, resume_hash, job_description_hash")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}
