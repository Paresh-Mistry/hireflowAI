import type { Metadata } from "next";
import { JobForm } from "@/components/jobs/job-form";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Create job" };

export default function NewJobPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Create job" description="Define the role. Required skills feed the AI analysis." />
      <JobForm />
    </div>
  );
}
