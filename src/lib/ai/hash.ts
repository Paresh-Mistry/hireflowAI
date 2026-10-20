import { createHash } from "node:crypto";

/** Resume hash matches the generated candidates.resume_md5 column, so staleness is checked without loading text. */
export function resumeHash(text: string) {
  return createHash("md5").update(text).digest("hex");
}

export function sha256(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

/** Hash of the fields of a job that influence an analysis. */
export function jobFingerprint(job: { title: string; description: string; requirements: unknown }) {
  return sha256(JSON.stringify([job.title, job.description, job.requirements]));
}
