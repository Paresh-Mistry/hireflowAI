"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { toast } from "sonner";
import { Download, ExternalLink, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Select, Textarea } from "@/components/ui/form";
import { addApplication, deleteCandidate, getResumeUrl } from "@/features/candidates/actions";
import { addNote, deleteNote, updateNote } from "@/features/applications/actions";
import { formatDate, timeAgo } from "@/lib/utils/index";

export function CandidateMenu({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  return (
    <>
      <Dropdown.Root>
        <Dropdown.Trigger asChild>
          <Button variant="secondary" size="icon" aria-label="More actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </Dropdown.Trigger>
        <Dropdown.Portal>
          <Dropdown.Content align="end" sideOffset={6} className="z-50 min-w-44 rounded-[12px] border border-line bg-card p-1.5">
            <Dropdown.Item asChild>
              <Link href={`/candidates/${id}/edit`} className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-[#f3f1ec]">
                <Pencil className="h-4 w-4" /> Edit profile
              </Link>
            </Dropdown.Item>
            <Dropdown.Item
              onSelect={() => setOpen(true)}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-error-fg outline-none data-[highlighted]:bg-error-bg"
            >
              <Trash2 className="h-4 w-4" /> Delete candidate
            </Dropdown.Item>
          </Dropdown.Content>
        </Dropdown.Portal>
      </Dropdown.Root>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete ${name}?`}
        description="This permanently removes the candidate, their applications, notes, activity and AI analyses, and their resume file. This cannot be undone."
        confirmLabel="Delete candidate"
        destructive
        loading={busy}
        onConfirm={async () => {
          setBusy(true);
          const res = await deleteCandidate(id);
          setBusy(false);
          if (!res.ok) return toast.error(res.error);
          toast.success("Candidate deleted");
          router.push("/candidates");
          router.refresh();
        }}
      />
    </>
  );
}

export function ResumeActions({ candidateId }: { candidateId: string }) {
  const [busy, setBusy] = React.useState<"view" | "download" | null>(null);
  async function open(kind: "view" | "download") {
    setBusy(kind);
    const res = await getResumeUrl(candidateId);
    setBusy(null);
    if (!res.ok) return toast.error(res.error);
    if (kind === "view") window.open(res.data.url, "_blank", "noopener,noreferrer");
    else {
      const a = document.createElement("a");
      a.href = res.data.url;
      a.download = "";
      a.click();
    }
  }
  return (
    <div className="flex gap-2">
      <Button variant="secondary" size="sm" loading={busy === "view"} onClick={() => open("view")}>
        <ExternalLink className="h-4 w-4" /> Preview
      </Button>
      <Button variant="secondary" size="sm" loading={busy === "download"} onClick={() => open("download")}>
        <Download className="h-4 w-4" /> Download
      </Button>
    </div>
  );
}

export function AssociateJob({ candidateId, jobs }: { candidateId: string; jobs: { id: string; title: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [jobId, setJobId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add to job
      </Button>
      <DialogContent title="Add to a job" description="Create an application for this candidate. Only open jobs can accept applications.">
        {jobs.length === 0 ? (
          <p className="text-sm text-muted">There are no open jobs available for this candidate.</p>
        ) : (
          <div className="space-y-4">
            <label htmlFor="assoc-job" className="text-[13px] font-semibold">Job</label>
            <Select id="assoc-job" value={jobId} onChange={(e) => setJobId(e.target.value)}>
              <option value="">Select a job…</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </Select>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="secondary">Cancel</Button>
              </DialogClose>
              <Button
                disabled={!jobId}
                loading={busy}
                onClick={async () => {
                  setBusy(true);
                  const res = await addApplication(candidateId, jobId);
                  setBusy(false);
                  if (!res.ok) return toast.error(res.error);
                  toast.success("Application created");
                  setOpen(false);
                  router.refresh();
                }}
              >
                Add application
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface NoteItem {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author_id: string;
  author_name: string;
}

export function NotesPanel({
  applicationId,
  notes,
  currentUserId,
}: {
  applicationId: string;
  notes: NoteItem[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [editing, setEditing] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");
  const [removing, setRemoving] = React.useState<NoteItem | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await addNote({ application_id: applicationId, content: text });
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    setText("");
    toast.success("Note added");
    router.refresh();
  }

  return (
    <div>
      <form onSubmit={submit} className="space-y-2">
        <label htmlFor="note" className="sr-only">Add a note</label>
        <Textarea id="note" value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a note about this application…" maxLength={4000} />
        <div className="flex justify-end">
          <Button type="submit" size="sm" loading={busy} disabled={!text.trim()}>
            Add note
          </Button>
        </div>
      </form>

      {notes.length === 0 ? (
        <p className="mt-4 rounded-[12px] border border-dashed border-line p-5 text-center text-sm text-muted">
          No notes yet. Capture interview impressions and follow-ups here.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="rounded-[12px] border border-line p-3">
              <div className="flex items-center justify-between gap-2 text-xs text-muted">
                <span>
                  <strong className="text-ink">{n.author_name}</strong> · {timeAgo(n.created_at)}
                  {n.updated_at !== n.created_at && " · edited"}
                </span>
                {n.author_id === currentUserId && editing !== n.id && (
                  <span className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(n.id); setDraft(n.content); }} aria-label="Edit note">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setRemoving(n)} aria-label="Delete note">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </span>
                )}
              </div>
              {editing === n.id ? (
                <div className="mt-2 space-y-2">
                  <Textarea aria-label="Edit note" value={draft} onChange={(e) => setDraft(e.target.value)} />
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        const res = await updateNote(n.id, draft);
                        if (!res.ok) return toast.error(res.error);
                        setEditing(null);
                        toast.success("Note updated");
                        router.refresh();
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-1.5 whitespace-pre-wrap text-sm">{n.content}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Delete this note?"
        description="The note will be permanently removed."
        confirmLabel="Delete note"
        destructive
        onConfirm={async () => {
          if (!removing) return;
          const res = await deleteNote(removing.id);
          setRemoving(null);
          if (!res.ok) return toast.error(res.error);
          toast.success("Note deleted");
          router.refresh();
        }}
      />
    </div>
  );
}

export { formatDate };
