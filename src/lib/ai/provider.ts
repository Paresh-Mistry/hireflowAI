import "server-only";
import { AI_LIMITS } from "@/config/constants";
import { analysisJsonSchema, type AnalysisResult, analysisResultSchema } from "./schema";

export type AiErrorCode = "not_configured" | "rate_limited" | "timeout" | "provider_error" | "invalid_output";

export class AiError extends Error {
  constructor(
    public code: AiErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export interface AnalysisPrompt {
  system: string;
  user: string;
}

export interface AiProvider {
  name: string;
  model: string;
  analyze(prompt: AnalysisPrompt): Promise<AnalysisResult>;
}

/** Gemini REST provider (no SDK; easy to time-box and to mock). */
function geminiProvider(apiKey: string): AiProvider {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  return {
    name: "gemini",
    model,
    async analyze({ system, user }) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), AI_LIMITS.timeoutMs);
      let res: Response;
      try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: user }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 4096,
              responseMimeType: "application/json",
              responseSchema: toGeminiSchema(analysisJsonSchema),
            },
          }),
        });
      } catch (e) {
        if ((e as Error).name === "AbortError") throw new AiError("timeout", "The AI provider took too long to respond.");
        throw new AiError("provider_error", "Could not reach the AI provider.");
      } finally {
        clearTimeout(timer);
      }
      if (res.status === 429) throw new AiError("rate_limited", "The AI provider is rate limiting requests. Try again shortly.");
      if (!res.ok) throw new AiError("provider_error", `The AI provider returned an error (${res.status}).`);

      const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        throw new AiError("invalid_output", "The AI response was not valid JSON.");
      }
      const parsed = analysisResultSchema.safeParse(json);
      if (!parsed.success) throw new AiError("invalid_output", "The AI response did not match the expected structure.");
      return parsed.data;
    },
  };
}

/** Gemini's responseSchema uses an OpenAPI subset: uppercase type names. */
function toGeminiSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toGeminiSchema);
  if (node && typeof node === "object") {
    return Object.fromEntries(
      Object.entries(node).map(([k, v]) => [k, k === "type" && typeof v === "string" ? v.toUpperCase() : toGeminiSchema(v)]),
    );
  }
  return node;
}

/**
 * Test-only provider, enabled explicitly with AI_PROVIDER=mock (used by automated tests).
 * Results are stored with provider "mock" and labelled as such in the UI.
 */
function mockProvider(): AiProvider {
  return {
    name: "mock",
    model: "test-fixture",
    async analyze() {
      return analysisResultSchema.parse({
        summary: "Test fixture analysis used by automated tests.",
        matching_skills: ["TypeScript"],
        missing_or_unclear_requirements: ["Kubernetes experience is not evidenced"],
        evidence: [{ requirement: "TypeScript", excerpt: "Built apps in TypeScript", explanation: "Mentioned directly.", support: "strong" }],
        experience_alignment: { level: "moderate", explanation: "Fixture data." },
        interview_questions: ["Describe a recent TypeScript project."],
        caveats: ["This is a mock result."],
      });
    },
  };
}

export function getAiProvider(): AiProvider {
  if (process.env.AI_PROVIDER === "mock") return mockProvider();
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new AiError("not_configured", "AI analysis is not configured. Add GEMINI_API_KEY to the server environment.");
  }
  return geminiProvider(key);
}

export function isAiConfigured() {
  return process.env.AI_PROVIDER === "mock" || Boolean(process.env.GEMINI_API_KEY);
}
