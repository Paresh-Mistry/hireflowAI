"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { FileText, UploadCloud } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Card } from "@/components/ui/primitives";
import { createCandidate, updateCandidate } from "@/features/candidates/actions";
import { ALLOWED_RESUME_TYPES, MAX_RESUME_BYTES } from "@/config/constants";
import { parseSkills } from "@/lib/utils/index";

const urlOk = (v?: string) => !v || /^https?:\/\/\S+\.\S+$/i.test(v);
const formSchema = z.object({
  full_name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().optional(),
  location: z.string().optional(),
  current_title: z.string().optional(),
  experience_years: z
    .string()
    .optional()
    .refine((v) => !v || (Number(v) >= 0 && Number(v) <= 60), "Enter years between 0 and 60"),
  skills: z.string().optional(),
  linkedin_url: z.string().optional().refine(urlOk, "Enter a valid URL starting with https://"),
  portfolio_url: z.string().optional().refine(urlOk, "Enter a valid URL starting with https://"),
  job_id: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

export interface CandidateFormProps {
  jobs: { id: string; title: string }[];
  candidate?: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    location: string | null;
    current_title: string | null;
    experience_years: number | null;
    skills: string[];
    linkedin_url: string | null;
    portfolio_url: string | null;
    resume_filename: string | null;
  };
}

export function CandidateForm({ jobs, candidate }: CandidateFormProps) {
  const router = useRouter();
  const [file, setFile] = React.useState<File | null>(null);
  const [fileError, setFileError] = React.useState<string>();
  const [busy, setBusy] = React.useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: candidate?.full_name ?? "",
      email: candidate?.email ?? "",
      phone: candidate?.phone ?? "",
      location: candidate?.location ?? "",
      current_title: candidate?.current_title ?? "",
      experience_years: candidate?.experience_years?.toString() ?? "",
      skills: candidate?.skills.join(", ") ?? "",
      linkedin_url: candidate?.linkedin_url ?? "",
      portfolio_url: candidate?.portfolio_url ?? "",
      job_id: "",
    },
  });

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setFileError(undefined);
    if (!f) return setFile(null);
    if (!ALLOWED_RESUME_TYPES.includes(f.type)) {
      setFileError("Resume must be a PDF or plain-text file.");
      return setFile(null);
    }
    if (f.size > MAX_RESUME_BYTES) {
      setFileError("Resume must be 5 MB or smaller.");
      return setFile(null);
    }
    setFile(f);
  }

  async function onSubmit(values: FormValues) {
    setBusy(true);
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => {
      if (k !== "skills" && v !== undefined) fd.set(k, v);
    });
    fd.set("skills", JSON.stringify(parseSkills(values.skills ?? "")));
    if (file) fd.set("resume", file);

    const res = candidate ? await updateCandidate(candidate.id, fd) : await createCandidate(fd);
    setBusy(false);
    if (!res.ok) {
      if (res.fieldErrors) {
        Object.entries(res.fieldErrors).forEach(([k, m]) => {
          if (k === "resume") setFileError(m);
          else if (m) setError(k as keyof FormValues, { message: m });
        });
      }
      toast.error(res.error);
      return;
    }
    const id = candidate ? candidate.id : (res.data as { id: string }).id;
    const note = (res.data as { note?: string } | undefined)?.note;
    toast.success(candidate ? "Candidate updated" : "Candidate added");
    if (note) toast.warning(note);
    router.push(`/candidates/${id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <Card className="grid gap-4 p-6 sm:grid-cols-2">
        <Field label="Full name *" htmlFor="full_name" error={errors.full_name?.message}>
          <Input id="full_name" autoComplete="off" {...register("full_name")} />
        </Field>
        <Field label="Email *" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" {...register("email")} />
        </Field>
        <Field label="Phone" htmlFor="phone" error={errors.phone?.message}>
          <Input id="phone" type="tel" {...register("phone")} />
        </Field>
        <Field label="Location" htmlFor="location">
          <Input id="location" placeholder="City, Country" {...register("location")} />
        </Field>
        <Field label="Current job title" htmlFor="current_title">
          <Input id="current_title" {...register("current_title")} />
        </Field>
        <Field label="Years of experience" htmlFor="experience_years" error={errors.experience_years?.message}>
          <Input id="experience_years" type="number" step="0.5" min={0} max={60} {...register("experience_years")} />
        </Field>
        <Field label="Skills" htmlFor="skills" hint="Separate skills with commas" className="sm:col-span-2">
          <Input id="skills" placeholder="React, TypeScript, PostgreSQL" {...register("skills")} />
        </Field>
        <Field label="LinkedIn URL" htmlFor="linkedin_url" error={errors.linkedin_url?.message}>
          <Input id="linkedin_url" type="url" placeholder="https://linkedin.com/in/…" {...register("linkedin_url")} />
        </Field>
        <Field label="Portfolio URL" htmlFor="portfolio_url" error={errors.portfolio_url?.message}>
          <Input id="portfolio_url" type="url" placeholder="https://…" {...register("portfolio_url")} />
        </Field>
        {!candidate && (
          <Field label="Apply to a job (optional)" htmlFor="job_id" className="sm:col-span-2" hint="Only open jobs are listed">
            <Select id="job_id" {...register("job_id")}>
              <option value="">No application yet</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-base font-bold">Resume</h2>
        <p className="mb-3 text-xs text-muted">
          PDF or plain text, up to 5 MB. Text is extracted so the AI assistant can analyze it. Files are stored privately.
          {candidate?.resume_filename && ` Current file: ${candidate.resume_filename} (uploading replaces it).`}
        </p>
        <label
          htmlFor="resume"
          className="flex cursor-pointer items-center gap-3 rounded-[12px] border border-dashed border-line bg-[#faf9f6] p-4 hover:border-accent"
        >
          {file ? <FileText className="h-5 w-5 text-accent" /> : <UploadCloud className="h-5 w-5 text-muted" />}
          <span className="text-sm">
            {file ? (
              <>
                <strong>{file.name}</strong> · {(file.size / 1024).toFixed(0)} KB
              </>
            ) : (
              "Choose a file to upload"
            )}
          </span>
          <input id="resume" type="file" accept=".pdf,.txt,application/pdf,text/plain" className="sr-only" onChange={onPick} />
        </label>
        {fileError && (
          <p role="alert" className="mt-2 text-xs font-medium text-error-fg">
            {fileError}
          </p>
        )}
        {busy && file && (
          <div className="mt-3" role="progressbar" aria-label="Saving candidate and uploading resume" aria-busy>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#efede8]">
              <div className="skeleton h-full w-full" />
            </div>
            <p className="mt-1 text-xs text-muted">Saving and uploading resume…</p>
          </div>
        )}
      </Card>

      <div className="flex justify-end gap-2">
        <LinkButton href={candidate ? `/candidates/${candidate.id}` : "/candidates"} variant="secondary">
          Cancel
        </LinkButton>
        <Button type="submit" loading={busy}>
          {candidate ? "Save changes" : "Add candidate"}
        </Button>
      </div>
    </form>
  );
}
