import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE, type Stage } from "@/config/constants";
import type { Job } from "@/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function listJobs(supabase: Supabase, opts: { q?: string; status?: string; page?: number }) {
  const page = Math.max(1, opts.page ?? 1);
  let query = supabase
    .from("jobs")
    .select("id, title, department, location, employment_type, status, created_at, applications(count)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (opts.status && ["draft", "open", "closed"].includes(opts.status)) query = query.eq("status", opts.status);
  if (opts.q) {
    const q = opts.q.replace(/[,()%]/g, " ").trim();
    if (q) query = query.or(`title.ilike.%${q}%,department.ilike.%${q}%,location.ilike.%${q}%`);
  }
  const { data, count, error } = await query;
  if (error) throw new Error("Could not load jobs.");
  const total = count ?? 0;
  return {
    rows: (data ?? []).map((j) => ({
      ...(j as unknown as Omit<Job, "description" | "requirements">),
      application_count: (j.applications as { count: number }[] | undefined)?.[0]?.count ?? 0,
    })),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getJob(supabase: Supabase, id: string): Promise<Job | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await supabase
    .from("jobs")
    .select("id, title, department, location, employment_type, description, requirements, status, created_at")
    .eq("id", id)
    .maybeSingle();
  return (data as Job | null) ?? null;
}

export async function getJobApplications(supabase: Supabase, jobId: string) {
  const { data } = await supabase
    .from("applications")
    .select("id, stage, applied_at, candidate:candidates(id, full_name, current_title)")
    .eq("job_id", jobId)
    .order("applied_at", { ascending: false });
  return (data ?? []).map((a) => {
    const c = (Array.isArray(a.candidate) ? a.candidate[0] : a.candidate) as {
      id: string;
      full_name: string;
      current_title: string | null;
    };
    return { id: a.id as string, stage: a.stage as Stage, applied_at: a.applied_at as string, candidate: c };
  });
}

export async function listJobOptions(supabase: Supabase, onlyOpen = false) {
  let q = supabase.from("jobs").select("id, title, status").order("title");
  if (onlyOpen) q = q.eq("status", "open");
  const { data } = await q;
  return (data ?? []) as { id: string; title: string; status: string }[];
}
