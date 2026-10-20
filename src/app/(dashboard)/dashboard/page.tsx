import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { Activity, ArrowRight, Award, FileText, MessageSquare, PlusCircle, Sparkles, UserPlus, Workflow } from "lucide-react";
import { getProfile, requireUser } from "@/lib/supabase/server";
import { getDashboardData } from "@/features/dashboard/queries";
import { activeApplicationCount, funnelFromCounts, percentChange } from "@/features/dashboard/metrics";
import { ApplicationsOverTime, FunnelChart, StageDistribution } from "@/components/dashboard/charts";
import { Avatar, Card, EmptyState, MetricCard, StageBadge } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TickerRibbon } from "@/components/dashboard/TickerRibbon";
import { VideoText } from "@/components/ui/video-text";
import { firstParam, timeAgo } from "@/lib/utils/index";

export const metadata: Metadata = { title: "Overview" };

const EVENT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  application_created: UserPlus,
  stage_changed: Workflow,
  note_added: MessageSquare,
  resume_updated: FileText,
  ai_analysis_completed: Sparkles,
};

const RANGES = [7, 30, 90];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const requested = Number(firstParam(sp.days));
  const days = RANGES.includes(requested) ? requested : 30;

  const { supabase, user } = await requireUser();
  const [profile, data] = await Promise.all([getProfile(supabase, user.id), getDashboardData(supabase, days)]);
  const { stats, activity, recent } = data;
  const firstName = (profile?.full_name || user.email || "there").split(" ")[0];
  const funnel = funnelFromCounts(stats.stage_counts);
  const isEmpty = stats.total_candidates === 0 && stats.total_applications === 0;
  const activeApps = activeApplicationCount(stats.stage_counts);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold text-muted">{format(new Date(), "EEEE, MMMM d")}</p>
          <div className="relative h-14 w-full overflow-hidden">
            <VideoText src="https://cdn.magicui.design/ocean-small.webm" fontSize={12}>
              Welcome, {firstName}
            </VideoText>
          </div>
          <p className="mt-1 text-sm text-muted">
            {activeApps > 0
              ? `${activeApps} active application${activeApps === 1 ? "" : "s"} across ${stats.active_jobs} open role${stats.active_jobs === 1 ? "" : "s"}.`
              : "Add a job and your first candidates to start tracking your pipeline."}
          </p>
        </div>
        <div className="flex gap-2">
          <LinkButton href="/jobs/new" variant="secondary">
            <PlusCircle className="w-4 h-4 text-text-secondary" />
            <span>Create Job</span>
          </LinkButton>
          <LinkButton href="/candidates/new">
            <UserPlus className="w-4 h-4" />
            <span>Add Candidate</span>
          </LinkButton>

        </div>
      </div>

      {isEmpty ? (
        <EmptyState
          title="Your workspace is empty"
          description="Create a job opening, then add candidates and applications. Charts and activity will appear here."
          action={<LinkButton href="/jobs/new">Create your first job</LinkButton>}
        />
      ) : (
        <>
          <div className="flex items-center justify-start gap-1 text-xs" role="group" aria-label="Reporting period">
            {RANGES.map((r) => (
              <Link
                key={r}
                href={`/dashboard?days=${r}`}
                aria-current={r === days ? "true" : undefined}
                className={cn(
                  "rounded-full px-3 py-1 font-semibold",
                  r === days ? "bg-ink text-white" : "text-muted hover:bg-[#efede8]",
                )}
              >
                Last {r} days
              </Link>
            ))}
          </div>

          <section aria-label="Key metrics" className="grid gap-4 grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Total Candidates" value={stats.total_candidates} hint={`${stats.applications_current} new applications in ${days} days`} />
            <MetricCard label="Active Jobs" value={stats.active_jobs} hint="Jobs currently open for applications" />
            <MetricCard
              label="Active Applications"
              value={stats.active_applications}
              hint="Excludes hired and rejected"
              trend={{
                pct: percentChange(stats.active_applications, stats.applications_previous),
                label: `vs previous ${days} days`,
              }}
            />
            {stats.hires_current > 0 && (
              <MetricCard
                label={`Hires · last ${days} days`}
                value={stats.hires_current}
                hint={`${stats.hires_previous} in the previous ${days} days`}
                trend={{
                  pct: percentChange(stats.hires_current, stats.hires_previous),
                  label: `vs previous ${days} days`,
                }}
              />
            )}
          </section>

          <TickerRibbon />

          <section className="grid gap-4 lg:grid-cols-5">
            <Card className="p-5 lg:col-span-3">
              <h2 className="text-lg font-bold">Applications over time</h2>
              <p className="mb-3 text-xs text-muted">New applications per day, last {days} days</p>
              <ApplicationsOverTime data={stats.daily} />
            </Card>
            <Card className="p-5 lg:col-span-2">
              <h2 className="text-lg font-bold">Hiring funnel</h2>
              <p className="mb-3 text-xs text-muted">Applications by current stage</p>
              <FunnelChart data={funnel} />
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-5">
            <Card className="p-5 lg:col-span-2">
              <h2 className="mb-4 text-lg font-bold">Stage distribution</h2>
              <StageDistribution data={funnel} />
            </Card>
            <Card className="p-5 lg:col-span-3">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold">Recent activity</h2>
                <Activity className="h-4 w-4 text-muted" aria-hidden />
              </div>
              {activity.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">No activity yet.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {activity.map((a) => {
                    const Icon = EVENT_ICON[a.event_type] ?? Activity;
                    return (
                      <li key={a.id} className="flex items-start gap-3 py-3">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm">
                            {a.candidate ? (
                              <Link href={`/candidates/${a.candidate.id}`} className="font-semibold hover:text-accent">
                                {a.candidate.full_name}
                              </Link>
                            ) : (
                              <span className="font-semibold">Candidate</span>
                            )}{" "}
                            <span className="text-muted">· {a.description}</span>
                          </p>
                          {a.job_title && <p className="truncate text-xs text-muted">{a.job_title}</p>}
                        </div>
                        <time dateTime={a.created_at} className="shrink-0 text-xs text-muted">
                          {timeAgo(a.created_at)}
                        </time>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </section>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Recent candidates</h2>
              <Link href="/candidates" className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:text-accent-hover">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <ul className="divide-y divide-line">
              {recent.map((c) => (
                <li key={c.id}>
                  <Link href={`/candidates/${c.id}`} className="flex flex-wrap items-center gap-3 rounded-lg py-3 hover:bg-[#faf9f6] sm:flex-nowrap">
                    <Avatar name={c.full_name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{c.full_name}</p>
                      <p className="truncate text-xs text-muted">
                        {[c.current_title, c.job_title].filter(Boolean).join(" · ") || "No application yet"}
                      </p>
                    </div>
                    {c.stage && <StageBadge stage={c.stage} />}
                    <time dateTime={c.applied_at} className="w-24 text-right text-xs text-muted">
                      {format(new Date(c.applied_at), "MMM d, yyyy")}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
