import type { Metadata } from "next";
import { Kanban } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { getPipeline } from "@/features/applications/pipeline-queries";
import { listJobOptions } from "@/features/jobs/queries";
import { FilterBar } from "@/components/ui/filter-bar";
import { PipelineBoard } from "@/components/pipeline/board";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { firstParam } from "@/lib/utils/index";

export const metadata: Metadata = { title: "Pipeline" };

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = { job: firstParam(sp.job), q: firstParam(sp.q), from: firstParam(sp.from), to: firstParam(sp.to) };
  const { supabase } = await requireUser();
  const [cards, jobs] = await Promise.all([getPipeline(supabase, filters), listJobOptions(supabase)]);
  const filtered = Object.values(filters).some(Boolean);

  return (
    <>
      <PageHeader title="Pipeline" description="Drag candidates between stages, or use the stage menu on each card." />
      <FilterBar
        fields={[
          { type: "search", name: "q", label: "Search", placeholder: "Candidate name or title…" },
          { type: "select", name: "job", label: "Job", allLabel: "All jobs", options: jobs.map((j) => ({ value: j.id, label: j.title })) },
          { type: "date", name: "from", label: "Applied from" },
          { type: "date", name: "to", label: "Applied to" },
        ]}
      />
      {cards.length === 0 ? (
        <EmptyState
          icon={Kanban}
          title={filtered ? "No applications match" : "Your pipeline is empty"}
          description={filtered ? "Adjust or clear the filters to see more applications." : "Add a candidate to a job and they will appear in the Applied column."}
          action={<LinkButton href={filtered ? "/pipeline" : "/candidates/new"}>{filtered ? "Clear filters" : "Add Candidate"}</LinkButton>}
        />
      ) : (
        <PipelineBoard key={cards.map((c) => `${c.id}:${c.stage}`).join("|")} initial={cards} />
      )}
    </>
  );
}
