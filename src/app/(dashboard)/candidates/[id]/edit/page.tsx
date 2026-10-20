import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getCandidate } from "@/features/candidates/queries";
import { CandidateForm } from "@/components/candidates/candidate-form";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Edit candidate" };

export default async function EditCandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const candidate = await getCandidate(supabase, id);
  if (!candidate) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={`Edit ${candidate.full_name}`} />
      <CandidateForm jobs={[]} candidate={candidate} />
    </div>
  );
}
