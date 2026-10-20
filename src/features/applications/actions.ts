"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { moveStageSchema, noteSchema } from "@/lib/validation/schemas";
import { validateTransition } from "@/lib/permissions/stage-transitions";
import type { Stage } from "@/config/constants";
import { fail, ok, type ActionResult } from "@/types";

/** Server-side stage change: re-reads the current stage, validates the transition, persists. */
export async function moveApplicationStage(input: {
  application_id: string;
  to: Stage;
  rejection_reason?: string;
}): Promise<ActionResult<{ from: Stage; to: Stage }>> {
  const { supabase } = await requireUser();
  const parsed = moveStageSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid request.");

  const { data: current } = await supabase
    .from("applications")
    .select("stage")
    .eq("id", parsed.data.application_id)
    .maybeSingle();
  if (!current) return fail("Application not found.");

  const check = validateTransition(current.stage as Stage, parsed.data.to);
  if (!check.ok) return fail(check.reason);

  // Compare-and-set on the previous stage so concurrent moves cannot silently overwrite each other.
  const { data, error } = await supabase
    .from("applications")
    .update({
      stage: parsed.data.to,
      rejection_reason: parsed.data.to === "rejected" ? (parsed.data.rejection_reason ?? null) : null,
    })
    .eq("id", parsed.data.application_id)
    .eq("stage", current.stage)
    .select("id");
  if (error) return fail("Could not update the stage. Please try again.");
  if (!data?.length) return fail("This application was changed by someone else. Refresh and try again.");

  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  return ok({ from: current.stage as Stage, to: parsed.data.to });
}

export async function addNote(input: { application_id: string; content: string }): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid note.");
  const { error } = await supabase
    .from("candidate_notes")
    .insert({ application_id: parsed.data.application_id, content: parsed.data.content, author_id: user.id });
  if (error) return fail("Could not save the note.");
  revalidatePath("/candidates/[id]", "page");
  return ok();
}

export async function updateNote(id: string, content: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const text = content.trim();
  if (!text || text.length > 4000) return fail("Note must be 1–4000 characters.");
  const { data, error } = await supabase.from("candidate_notes").update({ content: text }).eq("id", id).select("id");
  if (error || !data?.length) return fail("You can only edit your own notes.");
  revalidatePath("/candidates/[id]", "page");
  return ok();
}

export async function deleteNote(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("candidate_notes").delete().eq("id", id).select("id");
  if (error || !data?.length) return fail("You can only delete your own notes.");
  revalidatePath("/candidates/[id]", "page");
  return ok();
}
