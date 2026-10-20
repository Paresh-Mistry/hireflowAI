import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { Stage } from "@/config/constants";
import type { DashboardStatsRaw } from "./metrics";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

export async function getDashboardData(supabase: Supabase, days: number) {
  const [stats, activity, recent] = await Promise.all([
    supabase.rpc("dashboard_stats", { p_days: days }),
    supabase
      .from("activity_logs")
      .select("id, description, event_type, created_at, application:applications(id, candidate:candidates(id, full_name), job:jobs(title))")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("candidates")
      .select("id, full_name, current_title, created_at, applications(stage, applied_at, job:jobs(title))")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);
  if (stats.error || !stats.data) throw new Error("Could not load dashboard metrics.");

  return {
    stats: stats.data as DashboardStatsRaw,
    activity: (activity.data ?? []).map((a) => {
      const app = one(a.application) as { id: string; candidate: unknown; job: unknown } | null;
      const cand = one(app?.candidate as { id: string; full_name: string } | { id: string; full_name: string }[] | null);
      const job = one(app?.job as { title: string } | { title: string }[] | null);
      return {
        id: a.id as string,
        description: a.description as string,
        event_type: a.event_type as string,
        created_at: a.created_at as string,
        candidate: cand,
        job_title: job?.title ?? null,
      };
    }),
    recent: (recent.data ?? []).map((c) => {
      const apps = (c.applications ?? []) as { stage: Stage; applied_at: string; job: { title: string } | { title: string }[] | null }[];
      const latest = [...apps].sort((a, b) => b.applied_at.localeCompare(a.applied_at))[0];
      return {
        id: c.id as string,
        full_name: c.full_name as string,
        current_title: c.current_title as string | null,
        stage: latest?.stage ?? null,
        job_title: one(latest?.job ?? null)?.title ?? null,
        applied_at: latest?.applied_at ?? (c.created_at as string),
      };
    }),
  };
}
