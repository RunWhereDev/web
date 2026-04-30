import type { Regime } from "./types";

export const CLEAR_WIN_RATIO = 1.5;

export function classifyRegime(selfHostMonthlyUsd: number, apiMonthlyUsd: number): Regime {
  if (!Number.isFinite(selfHostMonthlyUsd)) return "api-wins";
  if (apiMonthlyUsd <= 0) return "api-wins";

  const ratio = Math.max(selfHostMonthlyUsd, apiMonthlyUsd) / Math.min(selfHostMonthlyUsd, apiMonthlyUsd);

  if (ratio < CLEAR_WIN_RATIO) return "close-call";
  return selfHostMonthlyUsd < apiMonthlyUsd ? "self-host-wins" : "api-wins";
}

export function costRatio(selfHostMonthlyUsd: number, apiMonthlyUsd: number) {
  if (!Number.isFinite(selfHostMonthlyUsd) || selfHostMonthlyUsd <= 0 || apiMonthlyUsd <= 0) {
    return null;
  }

  return Math.max(selfHostMonthlyUsd, apiMonthlyUsd) / Math.min(selfHostMonthlyUsd, apiMonthlyUsd);
}
