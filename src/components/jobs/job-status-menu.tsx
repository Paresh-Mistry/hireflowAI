"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { setJobStatus } from "@/features/jobs/actions";
import type { JobStatus } from "@/config/constants";

export function JobStatusActions({ id, status, title }: { id: string; status: JobStatus; title: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function change(next: JobStatus) {
    setBusy(true);
    const res = await setJobStatus(id, next);
    setBusy(false);
    setConfirm(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(next === "open" ? "Job is now open" : next === "closed" ? "Job closed" : "Job moved to draft");
    router.refresh();
  }

  return (
    <>
      {status === "open" ? (
        <Button variant="secondary" onClick={() => setConfirm(true)}>Close job</Button>
      ) : (
        <Button variant="secondary" loading={busy} onClick={() => change("open")}>
          {status === "closed" ? "Reopen job" : "Publish job"}
        </Button>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Close “${title}”?`}
        description="Closed jobs stop accepting new applications. Existing applications stay in the pipeline and you can reopen the job at any time."
        confirmLabel="Close job"
        loading={busy}
        onConfirm={() => change("closed")}
      />
    </>
  );
}
