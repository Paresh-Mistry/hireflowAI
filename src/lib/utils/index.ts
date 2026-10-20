import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNowStrict, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function formatDate(value: string | Date | null | undefined, pattern = "MMM d, yyyy") {
  if (!value) return "—";
  return format(typeof value === "string" ? parseISO(value) : value, pattern);
}

export function timeAgo(value: string | Date) {
  const d = typeof value === "string" ? parseISO(value) : value;
  return `${formatDistanceToNowStrict(d)} ago`;
}

/** Deterministic avatar tint from a string. */
const TINTS = ["#E4E0FB", "#DCECF7", "#DCEFE5", "#F7E6CC", "#F9E0E0", "#E9E4DA"];
export function tintFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

export function firstParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function parseSkills(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 30),
    ),
  );
}

/** Sanitizes a filename for storage keys. */
export function safeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
}
