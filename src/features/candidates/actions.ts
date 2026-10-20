"use server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/supabase/server";
import { candidateSchema } from "@/lib/validation/schemas";
import { ALLOWED_RESUME_TYPES, MAX_RESUME_BYTES, RESUME_BUCKET } from "@/config/constants";
import { extractResumeText } from "@/lib/ai/extract";
import { safeFilename } from "@/lib/utils/index";
import { fail, ok, type ActionResult } from "@/types";

function readForm(formData: FormData) {
  let skills: string[] = [];
  try {
    skills = JSON.parse(String(formData.get("skills") ?? "[]"));
  } catch {
    skills = [];
  }
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : undefined;
  };
  return {
    full_name: get("full_name") ?? "",
    email: get("email") ?? "",
    phone: get("phone"),
    location: get("location"),
    current_title: get("current_title"),
    experience_years: get("experience_years"),
    skills,
    linkedin_url: get("linkedin_url"),
    portfolio_url: get("portfolio_url"),
    job_id: get("job_id"),
  };
}

function validateResume(file: FormDataEntryValue | null): { file?: File; error?: string } {
  if (!(file instanceof File) || file.size === 0) return {};
  if (!ALLOWED_RESUME_TYPES.includes(file.type)) return { error: "Resume must be a PDF or plain-text file." };
  if (file.size > MAX_RESUME_BYTES) return { error: "Resume must be 5 MB or smaller." };
  return { file };
}

async function storeResume(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  candidateId: string,
  file: File,
) {
  const path = `${userId}/${candidateId}/${randomUUID()}-${safeFilename(file.name)}`;
  const { error } = await supabase.storage.from(RESUME_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { ok: false, error: "Resume upload failed. Please try again." } as const;
  const extracted = await extractResumeText(file);
  return {
    ok: true,
    path,
    text: extracted.ok ? extracted.text : null,
    extractionNote: extracted.ok ? null : extracted.reason,
  } as const;
}

export async function createCandidate(formData: FormData): Promise<ActionResult<{ id: string; note?: string }>> {
  const { supabase, user } = await requireUser();
  const parsed = candidateSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return fail("Please fix the highlighted fields.", Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v?.[0] ?? ""])));
  }
  const resume = validateResume(formData.get("resume"));
  if (resume.error) return fail(resume.error, { resume: resume.error });

  const { job_id, ...fields } = parsed.data;
  const { data: created, error } = await supabase
    .from("candidates")
    .insert({ ...fields, created_by: user.id })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return fail("A candidate with this email already exists.", { email: "Email already in use" });
    return fail("Could not save the candidate. Please try again.");
  }

  let note: string | undefined;
  if (resume.file) {
    const stored = await storeResume(supabase, user.id, created.id, resume.file);
    if (!stored.ok) {
      await supabase.from("candidates").delete().eq("id", created.id); // no orphaned record
      return fail(stored.error);
    }
    const { error: upErr } = await supabase
      .from("candidates")
      .update({
        resume_path: stored.path,
        resume_filename: resume.file.name,
        resume_uploaded_at: new Date().toISOString(),
        resume_text: stored.text,
      })
      .eq("id", created.id);
    if (upErr) {
      await supabase.storage.from(RESUME_BUCKET).remove([stored.path]);
      await supabase.from("candidates").delete().eq("id", created.id);
      return fail("Could not attach the resume. Nothing was saved.");
    }
    if (stored.extractionNote) note = stored.extractionNote;
  }

  if (job_id) {
    const { error: appErr } = await supabase
      .from("applications")
      .insert({ candidate_id: created.id, job_id, created_by: user.id, source: "Manual entry" });
    if (appErr) note = "Candidate saved, but the application could not be created (is the job open?).";
  }

  revalidatePath("/candidates");
  revalidatePath("/dashboard");
  revalidatePath("/pipeline");
  return ok({ id: created.id, note });
}

export async function updateCandidate(id: string, formData: FormData): Promise<ActionResult<{ note?: string }>> {
  const { supabase, user } = await requireUser();
  const parsed = candidateSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return fail("Please fix the highlighted fields.", Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v?.[0] ?? ""])));
  }
  const resume = validateResume(formData.get("resume"));
  if (resume.error) return fail(resume.error, { resume: resume.error });

  const { job_id: _ignored, ...fields } = parsed.data;
  void _ignored;
  const patch: Record<string, unknown> = { ...fields };
  let note: string | undefined;
  let oldPath: string | null = null;

  if (resume.file) {
    const { data: existing } = await supabase.from("candidates").select("resume_path").eq("id", id).maybeSingle();
    oldPath = existing?.resume_path ?? null;
    const stored = await storeResume(supabase, user.id, id, resume.file);
    if (!stored.ok) return fail(stored.error);
    patch.resume_path = stored.path;
    patch.resume_filename = resume.file.name;
    patch.resume_uploaded_at = new Date().toISOString();
    patch.resume_text = stored.text;
    if (stored.extractionNote) note = stored.extractionNote;
  }

  const { data, error } = await supabase.from("candidates").update(patch).eq("id", id).select("id");
  if (error) {
    if (error.code === "23505") return fail("Another candidate already uses this email.", { email: "Email already in use" });
    return fail("Could not update the candidate.");
  }
  if (!data?.length) return fail("Candidate not found or you do not have access.");
  if (oldPath) await supabase.storage.from(RESUME_BUCKET).remove([oldPath]);

  revalidatePath(`/candidates/${id}`);
  revalidatePath("/candidates");
  return ok({ note });
}

export async function deleteCandidate(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { data: existing } = await supabase.from("candidates").select("resume_path").eq("id", id).maybeSingle();
  // Cascades only to this candidate's own applications, notes, activity and analyses.
  const { data, error } = await supabase.from("candidates").delete().eq("id", id).select("id");
  if (error) return fail("Could not delete the candidate.");
  if (!data?.length) return fail("You can only delete candidates you created.");
  if (existing?.resume_path) await supabase.storage.from(RESUME_BUCKET).remove([existing.resume_path]);
  revalidatePath("/candidates");
  revalidatePath("/dashboard");
  revalidatePath("/pipeline");
  return ok();
}

/** Short-lived signed URL; the read goes through RLS first so only members can obtain it. */
export async function getResumeUrl(candidateId: string): Promise<ActionResult<{ url: string }>> {
  const { supabase } = await requireUser();
  const { data: c } = await supabase
    .from("candidates")
    .select("resume_path, resume_filename")
    .eq("id", candidateId)
    .maybeSingle();
  if (!c?.resume_path) return fail("No resume on file.");
  const { data, error } = await supabase.storage
    .from(RESUME_BUCKET)
    .createSignedUrl(c.resume_path, 60, { download: false });
  if (error || !data) return fail("Could not create a secure link.");
  return ok({ url: data.signedUrl });
}

export async function addApplication(candidateId: string, jobId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("applications")
    .insert({ candidate_id: candidateId, job_id: jobId, created_by: user.id, source: "Manual entry" });
  if (error) {
    if (error.code === "23505") return fail("This candidate has already applied for that job.");
    if (error.code === "42501") return fail("That job is not open for applications.");
    return fail("Could not create the application.");
  }
  revalidatePath(`/candidates/${candidateId}`);
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  revalidatePath(`/jobs/${jobId}`);
  return ok();
}
