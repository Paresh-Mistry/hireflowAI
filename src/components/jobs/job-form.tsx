"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button, LinkButton } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Card } from "@/components/ui/primitives";
import { createJob, updateJob } from "@/features/jobs/actions";
import { EMPLOYMENT_TYPES, JOB_STATUSES } from "@/config/constants";
import { parseSkills } from "@/lib/utils/index";
import type { Job } from "@/types";

const formSchema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters"),
  department: z.string().optional(),
  location: z.string().optional(),
  employment_type: z.enum(EMPLOYMENT_TYPES),
  description: z.string().trim().min(20, "Add a short description (20+ characters)"),
  skills: z.string().optional(),
  min_experience_years: z
    .string()
    .optional()
    .refine((v) => !v || (Number(v) >= 0 && Number(v) <= 60), "Enter years between 0 and 60"),
  requirement_notes: z.string().optional(),
  status: z.enum(JOB_STATUSES),
});
type FormValues = z.infer<typeof formSchema>;

export function JobForm({ job }: { job?: Job }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: job?.title ?? "",
      department: job?.department ?? "",
      location: job?.location ?? "",
      employment_type: job?.employment_type ?? "full-time",
      description: job?.description ?? "",
      skills: job?.requirements.skills.join(", ") ?? "",
      min_experience_years: job?.requirements.min_experience_years?.toString() ?? "",
      requirement_notes: job?.requirements.notes ?? "",
      status: job?.status ?? "open",
    },
  });

  async function onSubmit(v: FormValues) {
    setBusy(true);
    const payload = { ...v, skills: parseSkills(v.skills ?? "") };
    const res = job ? await updateJob(job.id, payload) : await createJob(payload);
    setBusy(false);
    if (!res.ok) {
      Object.entries(res.fieldErrors ?? {}).forEach(([k, m]) => m && setError(k as keyof FormValues, { message: m }));
      return toast.error(res.error);
    }
    toast.success(job ? "Job updated" : "Job created");
    router.push(`/jobs/${job ? job.id : (res.data as { id: string }).id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <Card className="grid gap-4 p-6 sm:grid-cols-2">
        <Field label="Job title *" htmlFor="title" error={errors.title?.message} className="sm:col-span-2">
          <Input id="title" {...register("title")} />
        </Field>
        <Field label="Department" htmlFor="department">
          <Input id="department" {...register("department")} />
        </Field>
        <Field label="Location" htmlFor="location">
          <Input id="location" placeholder="City, Country or Remote" {...register("location")} />
        </Field>
        <Field label="Employment type" htmlFor="employment_type">
          <Select id="employment_type" {...register("employment_type")}>
            {EMPLOYMENT_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace("-", " ")}</option>
            ))}
          </Select>
        </Field>
        <Field label="Status" htmlFor="status" hint="Only open jobs accept new applications">
          <Select id="status" {...register("status")}>
            {JOB_STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </Select>
        </Field>
        <Field label="Description *" htmlFor="description" error={errors.description?.message} className="sm:col-span-2">
          <Textarea id="description" className="min-h-40" {...register("description")} />
        </Field>
        <Field label="Required skills" htmlFor="skills" hint="Separate with commas — used by AI analysis" className="sm:col-span-2">
          <Input id="skills" placeholder="React, TypeScript, SQL" {...register("skills")} />
        </Field>
        <Field label="Minimum experience (years)" htmlFor="min_experience_years" error={errors.min_experience_years?.message}>
          <Input id="min_experience_years" type="number" min={0} max={60} step="0.5" {...register("min_experience_years")} />
        </Field>
        <Field label="Experience notes" htmlFor="requirement_notes">
          <Input id="requirement_notes" placeholder="e.g. Startup experience preferred" {...register("requirement_notes")} />
        </Field>
      </Card>
      <div className="flex justify-end gap-2">
        <LinkButton href={job ? `/jobs/${job.id}` : "/jobs"} variant="secondary">Cancel</LinkButton>
        <Button type="submit" loading={busy}>{job ? "Save changes" : "Create job"}</Button>
      </div>
    </form>
  );
}
