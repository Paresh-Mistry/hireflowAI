import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { listJobOptions } from "@/features/jobs/queries";
import { CandidateForm } from "@/components/candidates/candidate-form";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Add candidate" };

export default async function NewCandidatePage() {
  const { supabase } = await requireUser();
  const jobs = await listJobOptions(supabase, true);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Add candidate" description="Create a profile, upload a resume and optionally attach an application." />
      <CandidateForm jobs={jobs} />
    </div>
  );
}
