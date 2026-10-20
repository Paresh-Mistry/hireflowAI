import { z } from "zod";
import { EMPLOYMENT_TYPES, JOB_STATUSES, STAGES } from "@/config/constants";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => !v || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v), "Enter a valid URL starting with http:// or https://");

export const candidateSchema = z.object({
  full_name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
  phone: optionalText(40),
  location: optionalText(120),
  current_title: optionalText(120),
  experience_years: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : Number(v)))
    .refine((v) => v === undefined || (!Number.isNaN(v) && v >= 0 && v <= 60), "Enter years between 0 and 60"),
  skills: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
  linkedin_url: optionalUrl,
  portfolio_url: optionalUrl,
  job_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
});
export type CandidateInput = z.infer<typeof candidateSchema>;

export const jobSchema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(160),
  department: optionalText(80),
  location: optionalText(120),
  employment_type: z.enum(EMPLOYMENT_TYPES),
  description: z.string().trim().min(20, "Add a short description (20+ characters)").max(8000),
  skills: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
  min_experience_years: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : Number(v)))
    .refine((v) => v === null || (!Number.isNaN(v) && v >= 0 && v <= 60), "Enter years between 0 and 60"),
  requirement_notes: optionalText(2000),
  status: z.enum(JOB_STATUSES),
});
export type JobInput = z.infer<typeof jobSchema>;

export const stageSchema = z.enum(STAGES);

export const moveStageSchema = z.object({
  application_id: z.string().uuid(),
  to: stageSchema,
  rejection_reason: z.string().trim().max(500).optional(),
});

export const noteSchema = z.object({
  application_id: z.string().uuid(),
  content: z.string().trim().min(1, "Write something first").max(4000),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const analyzeRequestSchema = z.object({
  application_id: z.string().uuid(),
  force: z.boolean().optional().default(false),
});

export const signupSchema = z
  .object({
    full_name: z.string().trim().min(2, "Enter your name").max(120),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match" });
