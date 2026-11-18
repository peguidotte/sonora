import type { Profile } from "../api/types";

export interface ComparisonMismatch {
  field: "period" | "origin" | "method";
  message: string;
}

/**
 * Checks whether two noise profiles can be placed side by side.
 *
 * docs/disciplinas/mobile.md requires "mesmo período/origem/método e
 * cobertura explícita" and forbids an absolute comfort ranking — this
 * function only says whether the pair is comparable; it never ranks them.
 */
export function findComparisonMismatches(a: Profile, b: Profile): ComparisonMismatch[] {
  const mismatches: ComparisonMismatch[] = [];

  if (a.from !== b.from || a.to !== b.to) {
    mismatches.push({
      field: "period",
      message: "The two locations were queried for different periods.",
    });
  }

  if (a.origin !== b.origin) {
    mismatches.push({
      field: "origin",
      message: "The two locations use different data origins (simulated vs. public_dataset).",
    });
  }

  const methodsA = new Set(a.series.map((series) => series.method));
  const methodsB = new Set(b.series.map((series) => series.method));
  const sharesMethod = [...methodsA].some((method) => methodsB.has(method));
  if (methodsA.size > 0 && methodsB.size > 0 && !sharesMethod) {
    mismatches.push({
      field: "method",
      message: "The two locations were measured with different, incompatible methods.",
    });
  }

  return mismatches;
}

export function describeCoverage(profile: Profile): string {
  if (profile.status === "no_data") {
    return "No observations in the requested period.";
  }
  const observedSeconds = profile.series
    .flatMap((series) => series.bins)
    .reduce((total, bin) => total + bin.observedSeconds, 0);
  const sessionCount = profile.series
    .flatMap((series) => series.bins)
    .reduce((total, bin) => total + bin.sessionCount, 0);
  return `${observedSeconds}s observed across ${sessionCount} session(s).`;
}
