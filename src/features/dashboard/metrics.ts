import { STAGES, type Stage } from "@/config/constants";

export interface DashboardStatsRaw {
  total_candidates: number;
  active_jobs: number;
  active_applications: number;
  total_applications: number;
  hires_current: number;
  hires_previous: number;
  applications_current: number;
  applications_previous: number;
  stage_counts: Partial<Record<Stage, number>>;
  daily: { day: string; count: number }[];
}

/** Percent change vs previous period; null when there is no baseline (never fabricate a %). */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function funnelFromCounts(counts: Partial<Record<Stage, number>>) {
  return STAGES.map((stage) => ({ stage, count: counts[stage] ?? 0 }));
}

export function activeApplicationCount(counts: Partial<Record<Stage, number>>) {
  return (["applied", "screening", "interview", "offer"] as Stage[]).reduce((s, k) => s + (counts[k] ?? 0), 0);
}
