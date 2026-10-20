export const STAGES = ["applied", "screening", "interview", "offer", "hired", "rejected"] as const;
export type Stage = (typeof STAGES)[number];

export const ACTIVE_STAGES: Stage[] = ["applied", "screening", "interview", "offer"];
export const TERMINAL_STAGES: Stage[] = ["hired", "rejected"];

export const STAGE_META: Record<Stage, { label: string; color: string; badge: string }> = {
  applied: { label: "Applied", color: "var(--stage-applied)", badge: "bg-[#ecebf0] text-[#4b4d5c]" },
  screening: { label: "Screening", color: "var(--stage-screening)", badge: "bg-accent-soft text-[#4a3fb0]" },
  interview: { label: "Interview", color: "var(--stage-interview)", badge: "bg-[#dcecf7] text-[#235b80]" },
  offer: { label: "Offer", color: "var(--stage-offer)", badge: "bg-warning-bg text-warning-fg" },
  hired: { label: "Hired", color: "var(--stage-hired)", badge: "bg-success-bg text-success-fg" },
  rejected: { label: "Rejected", color: "var(--stage-rejected)", badge: "bg-error-bg text-error-fg" },
};

export const EMPLOYMENT_TYPES = ["full-time", "part-time", "internship", "contract", "other"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const JOB_STATUSES = ["draft", "open", "closed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const PAGE_SIZE = 10;
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
export const ALLOWED_RESUME_TYPES = [
  // PDF and plain text are supported because text can be extracted for AI analysis.
  "application/pdf",
  "text/plain",
];
export const RESUME_BUCKET = "resumes";

/** Limits applied before any text is sent to the AI provider. */
export const AI_LIMITS = {
  maxResumeChars: 12_000,
  maxJobChars: 6_000,
  analysesPerHour: 20,
  timeoutMs: 45_000,
};

export const JOB_STATUS_STYLE: Record<JobStatus, string> = {
  open: "bg-success-bg text-success-fg",
  draft: "bg-warning-bg text-warning-fg",
  closed: "bg-[#ecebf0] text-[#4b4d5c]",
};
