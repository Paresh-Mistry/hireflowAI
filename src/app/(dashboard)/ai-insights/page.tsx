import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { listJobOptions } from "@/features/jobs/queries";
import { FilterBar } from "@/components/ui/filter-bar";
import { Avatar, Badge, Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { isAiConfigured } from "@/lib/ai/provider";
import { firstParam, formatDate } from "@/lib/utils/index";
import type { StoredAnalysis } from "@/lib/ai/schema";

export const metadata: Metadata = { title: "AI Insights" };

const ALIGN_STYLE: Record<string, string> = {
  Strong: "bg-success-bg text-success-fg",
  Moderate: "bg-warning-bg text-warning-fg",
  Limited: "bg-error-bg text-error-fg",
  "Insufficient information": "bg-[#ecebf0] text-[#4b4d5c]",
};

export default async function AiInsightsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const job = firstParam(sp.job);
  const q = firstParam(sp.q)?.toLowerCase();
  const { supabase } = await requireUser();

  let query = supabase
    .from("ai_analyses")
    .select(
      "id, created_at, result, job:jobs(id, title), application:applications(id, candidate:candidates(id, full_name, current_title))",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (job && /^[0-9a-f-]{36}$/i.test(job)) query = query.eq("job_id", job);
  const [{ data, error }, jobs] = await Promise.all([query, listJobOptions(supabase)]);
  if (error) throw new Error("Could not load AI analyses.");

  const rows = (data ?? [])
    .map((a) => {
      const app = (Array.isArray(a.application) ? a.application[0] : a.application) as {
        id: string;
        candidate: { id: string; full_name: string; current_title: string | null } | { id: string; full_name: string; current_title: string | null }[];
      } | null;
      const cand = Array.isArray(app?.candidate) ? app?.candidate[0] : app?.candidate;
      const j = (Array.isArray(a.job) ? a.job[0] : a.job) as { id: string; title: string } | null;
      return { id: a.id as string, created_at: a.created_at as string, result: a.result as StoredAnalysis, appId: app?.id, cand, job: j };
    })
    .filter((r) => r.cand && r.job && (!q || r.cand.full_name.toLowerCase().includes(q) || r.job.title.toLowerCase().includes(q)));

  return (
    <>
      <PageHeader
        title="AI Insights"
        description="Previously generated analyses. AI output is advisory — always verify with the candidate."
      />
      {!isAiConfigured() && (
        <p className="mb-4 rounded-[12px] bg-[#f3f1ec] px-4 py-3 text-sm">
          AI analysis is not configured on this server (missing <code>GEMINI_API_KEY</code>). Existing analyses remain viewable.
        </p>
      )}
      <FilterBar
        fields={[
          { type: "search", name: "q", label: "Search", placeholder: "Candidate or job…" },
          { type: "select", name: "job", label: "Job", allLabel: "All jobs", options: jobs.map((j) => ({ value: j.id, label: j.title })) },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No analyses yet"
          description="Open a candidate, select an application, and click “Analyze Candidate” to generate your first analysis."
          action={<LinkButton href="/candidates">Browse candidates</LinkButton>}
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const al = r.result.requirements_alignment;
            return (
              <li key={r.id}>
                <Card className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.cand!.full_name} />
                      <div>
                        <Link href={`/candidates/${r.cand!.id}?app=${r.appId}#ai`} className="font-semibold hover:text-accent">
                          {r.cand!.full_name}
                        </Link>
                        <p className="text-xs text-muted">
                          {r.job!.title} · analyzed {formatDate(r.created_at)}
                        </p>
                      </div>
                    </div>
                    {al && <Badge className={ALIGN_STYLE[al.label]}>Requirements alignment: {al.label}</Badge>}
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm text-muted">{r.result.summary}</p>
                  <div className="mt-3 flex gap-4 text-sm font-semibold">
                    <Link href={`/candidates/${r.cand!.id}?app=${r.appId}#ai`} className="text-accent hover:text-accent-hover">
                      View full analysis
                    </Link>
                    <Link href={`/candidates/${r.cand!.id}`} className="text-muted hover:text-ink">
                      Candidate profile
                    </Link>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
