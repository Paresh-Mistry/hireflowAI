import { ACTIVE_STAGES, TERMINAL_STAGES, type Stage } from "@/config/constants";

export type TransitionResult = { ok: true } | { ok: false; reason: string };

/**
 * Pipeline rules:
 *  - An application can move between any active stages (forward or back).
 *  - It can be moved to a terminal outcome (hired / rejected) from any active stage.
 *  - Terminal applications can only be explicitly reopened into an active stage,
 *    never switched directly between hired and rejected.
 */
export function validateTransition(from: Stage, to: Stage): TransitionResult {
  if (from === to) return { ok: false, reason: "Application is already in this stage." };
  const fromTerminal = TERMINAL_STAGES.includes(from);
  const toTerminal = TERMINAL_STAGES.includes(to);
  if (fromTerminal && toTerminal) {
    return { ok: false, reason: "Reopen the application before changing its outcome." };
  }
  return { ok: true };
}

export function isReopen(from: Stage, to: Stage) {
  return TERMINAL_STAGES.includes(from) && ACTIVE_STAGES.includes(to);
}

export function isActiveStage(stage: Stage) {
  return ACTIVE_STAGES.includes(stage);
}
