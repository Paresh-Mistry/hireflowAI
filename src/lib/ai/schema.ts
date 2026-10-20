import { z } from "zod";

const s = (max: number) => z.string().trim().min(1).max(max);

export const analysisResultSchema = z.object({
  summary: s(1200),
  matching_skills: z.array(s(80)).max(25),
  missing_or_unclear_requirements: z.array(s(240)).max(20),
  evidence: z
    .array(
      z.object({
        requirement: s(160),
        excerpt: z.string().trim().max(400).default(""),
        explanation: s(500),
        support: z.enum(["strong", "partial", "none"]),
      }),
    )
    .max(20),
  experience_alignment: z.object({
    level: z.enum(["strong", "moderate", "limited", "unclear"]),
    explanation: s(800),
  }),
  interview_questions: z.array(s(300)).min(1).max(10),
  caveats: z.array(s(300)).max(8),
});
export type AnalysisResult = z.infer<typeof analysisResultSchema>;

/** Stored shape = validated model output + deterministic alignment computed server-side. */
export const storedAnalysisSchema = analysisResultSchema.extend({
  requirements_alignment: z
    .object({
      label: z.enum(["Strong", "Moderate", "Limited", "Insufficient information"]),
      criteria: z.array(
        z.object({
          name: z.string(),
          weight: z.number(),
          score: z.number().nullable(),
          note: z.string(),
        }),
      ),
      method: z.string(),
    })
    .optional(),
});
export type StoredAnalysis = z.infer<typeof storedAnalysisSchema>;

/** JSON schema handed to the provider for structured output. */
export const analysisJsonSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    matching_skills: { type: "array", items: { type: "string" } },
    missing_or_unclear_requirements: { type: "array", items: { type: "string" } },
    evidence: {
      type: "array",
      items: {
        type: "object",
        properties: {
          requirement: { type: "string" },
          excerpt: { type: "string" },
          explanation: { type: "string" },
          support: { type: "string", enum: ["strong", "partial", "none"] },
        },
        required: ["requirement", "excerpt", "explanation", "support"],
      },
    },
    experience_alignment: {
      type: "object",
      properties: {
        level: { type: "string", enum: ["strong", "moderate", "limited", "unclear"] },
        explanation: { type: "string" },
      },
      required: ["level", "explanation"],
    },
    interview_questions: { type: "array", items: { type: "string" } },
    caveats: { type: "array", items: { type: "string" } },
  },
  required: [
    "summary",
    "matching_skills",
    "missing_or_unclear_requirements",
    "evidence",
    "experience_alignment",
    "interview_questions",
    "caveats",
  ],
} as const;
