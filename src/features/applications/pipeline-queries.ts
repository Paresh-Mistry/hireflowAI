import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { Stage } from "@/config/constants";
import type { PipelineCard } from "@/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

export async function getPipeline(
  supabase: Supabase,
  f: { job?: string; q?: string; from?: string; to?: string },
): Promise<PipelineCard[]> {
  // One query: only the fields the cards render, joined server-side (no N+1).
  let query = supabase
    .from("applications")
    .select(
      "id, stage, applied_at, candidate:candidates!inner(id, full_name, current_title, skills), job:jobs!inner(id, title), ai:ai_analyses(id)",
    )
    .order("applied_at", { ascending: false })
    .limit(500);
  if (f.job && /^[0-9a-f-]{36}$/i.test(f.job)) query = query.eq("job_id", f.job);
  if (f.from && /^\d{4}-\d{2}-\d{2}$/.test(f.from)) query = query.gte("applied_at", f.from);
  if (f.to && /^\d{4}-\d{2}-\d{2}$/.test(f.to)) query = query.lte("applied_at", `${f.to}T23:59:59`);
  if (f.q) {
    const q = f.q.replace(/[,()%]/g, " ").trim();
    if (q) query = query.or(`full_name.ilike.%${q}%,current_title.ilike.%${q}%`, { referencedTable: "candidates" });
  }
  const { data, error } = await query;
  if (error) throw new Error("Could not load the pipeline.");
  return (data ?? []).map((a) => ({
    id: a.id as string,
    stage: a.stage as Stage,
    applied_at: a.applied_at as string,
    candidate: one(a.candidate) as PipelineCard["candidate"],
    job: one(a.job) as PipelineCard["job"],
    analyzed: ((a.ai as unknown[]) ?? []).length > 0,
  }));
}
