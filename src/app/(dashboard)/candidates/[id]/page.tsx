import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, FileText, Globe, Link2, Mail, MapPin, MessageSquare, Phone, Sparkles, UserPlus, Workflow } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import {
  getActivity,
  getCandidate,
  getCandidateApplications,
  getLatestAnalysis,
  getNotes,
} from "@/features/candidates/queries";
import { getJob, listJobOptions } from "@/features/jobs/queries";
import { AnalysisPanel, type AnalysisMeta } from "@/components/ai/analysis-panel";
import { AssociateJob, CandidateMenu, NotesPanel, ResumeActions } from "@/components/candidates/detail-client";
import { Avatar, Card, EmptyState, SkillBadge, StageBadge } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { isAiConfigured } from "@/lib/ai/provider";
import { jobFingerprint } from "@/lib/ai/hash";
import { cn, firstParam, formatDate, timeAgo } from "@/lib/utils/index";

export const metadata: Metadata = { title: "Candidate" };

const EVENT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  application_created: UserPlus,
  stage_changed: Workflow,
  note_added: MessageSquare,
  resume_updated: FileText,
  ai_analysis_completed: Sparkles,
};

export default async function CandidateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, user } = await requireUser();

  const candidate = await getCandidate(supabase, id);
  if (!candidate) notFound();

  const [applications, openJobs] = await Promise.all([getCandidateApplications(supabase, id), listJobOptions(supabase, true)]);
  const selected = applications.find((a) => a.id === firstParam(sp.app)) ?? applications[0] ?? null;
  const appliedJobIds = new Set(applications.map((a) => a.job.id));
  const availableJobs = openJobs.filter((j) => !appliedJobIds.has(j.id));

  const [notes, activity, latest, job] = selected
    ? await Promise.all([
        getNotes(supabase, selected.id),
        getActivity(supabase, selected.id),
        getLatestAnalysis(supabase, selected.id),
        getJob(supabase, selected.job.id),
      ])
    : [[], [], null, null];

  let analysis: AnalysisMeta | null = null;
  if (latest) {
    const stale =
      latest.resume_hash !== candidate.resume_md5 || (job ? latest.job_description_hash !== jobFingerprint(job) : false);
    analysis = {
      id: latest.id,
      provider: latest.provider,
      model: latest.model,
      created_at: latest.created_at,
      result: latest.result,
      stale,
    };
  }

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-start justify-between gap-4 p-6">
        <div className="flex items-start gap-4">
          <Avatar name={candidate.full_name} size={64} />
          <div>
            <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">{candidate.full_name}</h1>
            <p className="text-sm text-muted">{candidate.current_title ?? "No title on file"}</p>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted">
              {candidate.location && (
                <li className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{candidate.location}</li>
              )}
              <li className="flex items-center gap-1.5"><Mail className="h-4 w-4" /><a className="hover:text-ink" href={`mailto:${candidate.email}`}>{candidate.email}</a></li>
              {candidate.phone && (
                <li className="flex items-center gap-1.5"><Phone className="h-4 w-4" />{candidate.phone}</li>
              )}
              {candidate.linkedin_url && (
                <li className="flex items-center gap-1.5"><Link2 className="h-4 w-4" /><a className="hover:text-ink" href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
              )}
              {candidate.portfolio_url && (
                <li className="flex items-center gap-1.5"><Globe className="h-4 w-4" /><a className="hover:text-ink" href={candidate.portfolio_url} target="_blank" rel="noopener noreferrer">Portfolio</a></li>
              )}
            </ul>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LinkButton href={`/candidates/${id}/edit`} variant="secondary">Edit</LinkButton>
          <CandidateMenu id={id} name={candidate.full_name} />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold">Applications</h2>
              <AssociateJob candidateId={id} jobs={availableJobs} />
            </div>
            {applications.length === 0 ? (
              <p className="rounded-[12px] border border-dashed border-line p-5 text-center text-sm text-muted">
                This candidate has not been added to any job yet.
              </p>
            ) : (
              <ul className="space-y-2" aria-label="Select an application">
                {applications.map((a) => {
                  const active = a.id === selected?.id;
                  return (
                    <li key={a.id}>
                      <Link
                        href={`/candidates/${id}?app=${a.id}`}
                        aria-current={active ? "true" : undefined}
                        className={cn(
                          "flex flex-wrap items-center justify-between gap-3 rounded-[12px] border p-3.5 transition-colors",
                          active ? "border-accent bg-accent-soft/50" : "border-line hover:bg-[#faf9f6]",
                        )}
                      >
                        <div>
                          <p className="font-semibold">{a.job.title}</p>
                          <p className="text-xs text-muted">
                            Applied {formatDate(a.applied_at)} · last change {timeAgo(a.last_stage_changed_at)}
                            {a.latest_analysis_at ? " · AI analysis available" : ""}
                          </p>
                        </div>
                        <StageBadge stage={a.stage} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {selected ? (
            <>
              <AnalysisPanel
                key={`${selected.id}-${latest?.id ?? "none"}`}
                applicationId={selected.id}
                jobTitle={selected.job.title}
                initial={analysis}
                hasResumeText={candidate.has_resume_text}
                aiConfigured={isAiConfigured()}
              />
              <Card className="p-6">
                <h2 className="mb-4 text-lg font-bold">Notes <span className="text-sm font-normal text-muted">· {selected.job.title}</span></h2>
                <NotesPanel applicationId={selected.id} notes={notes} currentUserId={user.id} />
              </Card>
              <Card className="p-6">
                <h2 className="mb-4 text-lg font-bold">Activity timeline</h2>
                {activity.length === 0 ? (
                  <p className="text-sm text-muted">No activity recorded yet.</p>
                ) : (
                  <ol className="relative space-y-4 border-l border-line pl-6">
                    {activity.map((a) => {
                      const Icon = EVENT_ICON[a.event_type] ?? Activity;
                      return (
                        <li key={a.id} className="relative">
                          <span className="absolute -left-[37px] flex h-7 w-7 items-center justify-center rounded-full border border-line bg-card text-accent">
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <p className="text-sm font-medium">{a.description}</p>
                          <p className="text-xs text-muted">
                            {a.actor_name ? `${a.actor_name} · ` : ""}
                            <time dateTime={a.created_at}>{formatDate(a.created_at, "MMM d, yyyy 'at' h:mm a")}</time>
                          </p>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </Card>
            </>
          ) : (
            <EmptyState
              icon={Sparkles}
              title="Add this candidate to a job"
              description="Notes, activity and AI analysis are tracked per application. Associate a job to get started."
            />
          )}
        </div>

        <aside className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-3 text-lg font-bold">Resume</h2>
            {candidate.resume_path ? (
              <>
                <div className="mb-3 flex items-start gap-3 rounded-[12px] bg-[#faf9f6] p-3">
                  <FileText className="mt-0.5 h-5 w-5 text-accent" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{candidate.resume_filename}</p>
                    <p className="text-xs text-muted">Uploaded {formatDate(candidate.resume_uploaded_at)}</p>
                    {!candidate.has_resume_text && (
                      <p className="mt-1 text-xs text-warning-fg">Text could not be extracted — AI analysis unavailable.</p>
                    )}
                  </div>
                </div>
                <ResumeActions candidateId={id} />
                <p className="mt-2 text-xs text-muted">Links are private and expire after 60 seconds.</p>
              </>
            ) : (
              <p className="text-sm text-muted">No resume uploaded. <Link className="font-semibold text-accent" href={`/candidates/${id}/edit`}>Upload one</Link>.</p>
            )}
          </Card>
          <Card className="p-6">
            <h2 className="mb-3 text-lg font-bold">Skills & experience</h2>
            {candidate.skills.length ? (
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.map((s) => (
                  <SkillBadge key={s}>{s}</SkillBadge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No skills listed.</p>
            )}
            {candidate.experience_years !== null && (
              <p className="mt-4 text-sm">
                <span className="tabular text-2xl font-extrabold">{candidate.experience_years}</span>{" "}
                <span className="text-muted">years of experience</span>
              </p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
