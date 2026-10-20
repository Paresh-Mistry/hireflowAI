import type { EmploymentType, JobStatus, Stage } from "@/config/constants";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const ok = <T = undefined>(data?: T): ActionResult<T> => ({ ok: true, data: data as T });
export const fail = (error: string, fieldErrors?: Record<string, string>): ActionResult<never> => ({
  ok: false,
  error,
  fieldErrors,
});

export interface JobRequirements {
  skills: string[];
  min_experience_years: number | null;
  notes: string;
}

export interface Job {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  employment_type: EmploymentType;
  description: string;
  requirements: JobRequirements;
  status: JobStatus;
  created_at: string;
}

export interface CandidateRow {
  id: string;
  full_name: string;
  email: string;
  current_title: string | null;
  location: string | null;
  skills: string[];
  created_at: string;
  applications: { id: string; job_id: string; job_title: string; stage: Stage; applied_at: string }[];
  total_count: number;
}

export interface Candidate {
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
  resume_path: string | null;
  resume_filename: string | null;
  resume_uploaded_at: string | null;
  has_resume_text: boolean;
  created_at: string;
}

export interface ApplicationSummary {
  id: string;
  stage: Stage;
  applied_at: string;
  last_stage_changed_at: string;
  rejection_reason: string | null;
  job: { id: string; title: string; status: JobStatus };
  latest_analysis_at: string | null;
}

export interface PipelineCard {
  id: string;
  stage: Stage;
  applied_at: string;
  candidate: { id: string; full_name: string; current_title: string | null; skills: string[] };
  job: { id: string; title: string };
  analyzed: boolean;
}
