"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { jobSchema } from "@/lib/validation/schemas";
import { JOB_STATUSES, type JobStatus } from "@/config/constants";
import { fail, ok, type ActionResult } from "@/types";

function toRow(input: unknown) {
  const parsed = jobSchema.safeParse(input);
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      error: fail(
        "Please fix the highlighted fields.",
        Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v?.[0] ?? ""])),
      ),
    } as const;
  }
  const { skills, min_experience_years, requirement_notes, ...rest } = parsed.data;
  return {
    ok: true,
    row: {
      ...rest,
      requirements: { skills, min_experience_years, notes: requirement_notes ?? "" },
    },
  } as const;
}

export async function createJob(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = await requireUser();
  const r = toRow(input);
  if (!r.ok) return r.error;
  const { data, error } = await supabase.from("jobs").insert({ ...r.row, created_by: user.id }).select("id").single();
  if (error) return fail("Could not create the job.");
  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  return ok({ id: data.id });
}

export async function updateJob(id: string, input: unknown): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const r = toRow(input);
  if (!r.ok) return r.error;
  const { data, error } = await supabase.from("jobs").update(r.row).eq("id", id).select("id");
  if (error || !data?.length) return fail("Could not update the job.");
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${id}`);
  revalidatePath("/dashboard");
  return ok();
}

export async function setJobStatus(id: string, status: JobStatus): Promise<ActionResult> {
  const { supabase } = await requireUser();
  if (!JOB_STATUSES.includes(status)) return fail("Invalid status.");
  const { data, error } = await supabase.from("jobs").update({ status }).eq("id", id).select("id");
  if (error || !data?.length) return fail("Could not change the job status.");
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${id}`);
  revalidatePath("/dashboard");
  return ok();
}
