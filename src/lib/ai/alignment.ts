import type { AnalysisResult } from "./schema";

/**
 * Requirements alignment — a transparent, deterministic summary of the model's evidence.
 * It is NOT a hiring probability. Only job-related criteria are used, and criteria
 * with no available information are excluded rather than penalised.
 *
 * Dimensions (weights):
 *   - Required skills coverage (50): share of the job's required skills the evidence supports
 *   - Experience level (30): from the model's experience_alignment level
 *   - Evidence quality (20): share of evidence items with strong/partial support
 */
const LEVEL_SCORE: Record<AnalysisResult["experience_alignment"]["level"], number | null> = {
  strong: 1,
  moderate: 0.65,
  limited: 0.3,
  unclear: null,
};

export interface AlignmentCriterion {
  name: string;
  weight: number;
  score: number | null;
  note: string;
}

export function computeAlignment(result: AnalysisResult, requiredSkills: string[]) {
  const criteria: AlignmentCriterion[] = [];
  const norm = (x: string) => x.toLowerCase().trim();
  const matched = new Set(result.matching_skills.map(norm));

  if (requiredSkills.length > 0) {
    const hit = requiredSkills.filter((r) => matched.has(norm(r)) || [...matched].some((m) => m.includes(norm(r)) || norm(r).includes(m)));
    criteria.push({
      name: "Required skills coverage",
      weight: 50,
      score: hit.length / requiredSkills.length,
      note: `${hit.length} of ${requiredSkills.length} listed skills evidenced in the resume`,
    });
  } else {
    criteria.push({ name: "Required skills coverage", weight: 50, score: null, note: "Job lists no required skills" });
  }

  const lvl = LEVEL_SCORE[result.experience_alignment.level];
  criteria.push({
    name: "Experience level",
    weight: 30,
    score: lvl,
    note: lvl === null ? "Experience could not be assessed from the resume" : `Model assessment: ${result.experience_alignment.level}`,
  });

  if (result.evidence.length > 0) {
    const supported = result.evidence.filter((e) => e.support !== "none").length;
    criteria.push({
      name: "Evidence quality",
      weight: 20,
      score: supported / result.evidence.length,
      note: `${supported} of ${result.evidence.length} checked requirements have resume support`,
    });
  } else {
    criteria.push({ name: "Evidence quality", weight: 20, score: null, note: "No evidence items returned" });
  }

  const scored = criteria.filter((c) => c.score !== null);
  const totalWeight = scored.reduce((s, c) => s + c.weight, 0);
  let label: "Strong" | "Moderate" | "Limited" | "Insufficient information" = "Insufficient information";
  if (scored.length >= 2 && totalWeight >= 50) {
    const value = scored.reduce((s, c) => s + (c.score as number) * c.weight, 0) / totalWeight;
    label = value >= 0.75 ? "Strong" : value >= 0.5 ? "Moderate" : "Limited";
  }

  return {
    label,
    criteria,
    method:
      "Weighted average of job-related criteria (skills coverage 50%, experience level 30%, evidence quality 20%). Criteria without information are excluded, not penalised. Shown as a qualitative band, not a probability of hiring success.",
  };
}
