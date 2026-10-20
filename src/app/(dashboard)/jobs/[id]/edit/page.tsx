import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getJob } from "@/features/jobs/queries";
import { JobForm } from "@/components/jobs/job-form";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Edit job" };

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const job = await getJob(supabase, id);
  if (!job) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={`Edit ${job.title}`} />
      <JobForm job={job} />
    </div>
  );
}
