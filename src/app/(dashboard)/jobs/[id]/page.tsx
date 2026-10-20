import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { getJob, getJobApplications } from "@/features/jobs/queries";
import { JobStatusActions } from "@/components/jobs/job-status-menu";
import { Avatar, Badge, Card, EmptyState, SkillBadge, StageBadge } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { JOB_STATUS_STYLE, STAGES, STAGE_META } from "@/config/constants";
import { formatDate } from "@/lib/utils/index";

export const metadata: Metadata = { title: "Job" };

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const job = await getJob(supabase, id);
  if (!job) notFound();
  const applications = await getJobApplications(supabase, id);
  const counts = STAGES.map((s) => ({ stage: s, count: applications.filter((a) => a.stage === s).length }));
  const max = Math.max(1, ...counts.map((c) => c.count));

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-start justify-between gap-4 p-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">{job.title}</h1>
            <Badge className={`${JOB_STATUS_STYLE[job.status]} capitalize`}>{job.status}</Badge>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 text-sm text-muted">
            <span>{job.department ?? "No department"}</span>
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location ?? "Unspecified"}</span>
            <span className="capitalize">{job.employment_type.replace("-", " ")}</span>
            <span>Created {formatDate(job.created_at)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <LinkButton href={`/jobs/${id}/edit`} variant="secondary">Edit</LinkButton>
          <JobStatusActions id={id} status={job.status} title={job.title} />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <h2 className="mb-2 text-lg font-bold">Overview</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{job.description}</p>
          </Card>
          <Card className="p-6">
            <h2 className="mb-3 text-lg font-bold">Candidates <span className="text-sm font-normal text-muted">· {applications.length}</span></h2>
            {applications.length === 0 ? (
              <EmptyState title="No applications yet" description="Add candidates to this job from their profile or the Add Candidate form." action={<LinkButton href="/candidates/new">Add Candidate</LinkButton>} />
            ) : (
              <ul className="divide-y divide-line">
                {applications.map((a) => (
                  <li key={a.id}>
                    <Link href={`/candidates/${a.candidate.id}?app=${a.id}`} className="flex items-center gap-3 py-3 hover:bg-[#faf9f6]">
                      <Avatar name={a.candidate.full_name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{a.candidate.full_name}</p>
                        <p className="truncate text-xs text-muted">{a.candidate.current_title ?? "—"} · applied {formatDate(a.applied_at)}</p>
                      </div>
                      <StageBadge stage={a.stage} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-3 text-lg font-bold">Requirements</h2>
            {job.requirements.skills.length ? (
              <div className="flex flex-wrap gap-1.5">
                {job.requirements.skills.map((s) => (
                  <SkillBadge key={s}>{s}</SkillBadge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No required skills listed.</p>
            )}
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Minimum experience</dt>
                <dd className="font-semibold">
                  {job.requirements.min_experience_years !== null ? `${job.requirements.min_experience_years} yrs` : "Not specified"}
                </dd>
              </div>
              {job.requirements.notes && <p className="text-muted">{job.requirements.notes}</p>}
            </dl>
          </Card>
          <Card className="p-6">
            <h2 className="mb-3 text-lg font-bold">Stage distribution</h2>
            <ul className="space-y-2.5">
              {counts.map((c) => (
                <li key={c.stage} className="text-sm">
                  <div className="mb-1 flex justify-between">
                    <span>{STAGE_META[c.stage].label}</span>
                    <span className="tabular font-semibold">{c.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#efede8]">
                    <div className="h-full rounded-full" style={{ width: `${(c.count / max) * 100}%`, background: STAGE_META[c.stage].color }} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
