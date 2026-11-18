import { describeCoverage, findComparisonMismatches } from "./compare";
import type { Profile } from "../api/types";

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    locationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    from: "2026-11-08T15:00:00Z",
    to: "2026-11-08T16:00:00Z",
    timezone: "America/Sao_Paulo",
    origin: "simulated",
    aggregation: "hour",
    status: "available",
    laeqDbA: 60,
    sources: [],
    series: [
      {
        producerId: "11111111-1111-4111-8111-111111111111",
        method: "wokwi_linear_demo",
        calibrationStatus: "simulated",
        bins: [
          {
            from: "2026-11-08T15:00:00Z",
            to: "2026-11-08T16:00:00Z",
            laeqDbA: 60,
            observationCount: 2,
            sessionCount: 1,
            observedSeconds: 10,
            firstObservedAt: "2026-11-08T15:00:00Z",
            lastObservedAt: "2026-11-08T15:00:05Z",
          },
        ],
      },
    ],
    limitations: [],
    ...overrides,
  };
}

describe("findComparisonMismatches", () => {
  it("finds no mismatch for two identical periods/origin/method", () => {
    expect(findComparisonMismatches(profile(), profile())).toEqual([]);
  });

  it("flags a different period", () => {
    const mismatches = findComparisonMismatches(profile(), profile({ to: "2026-11-08T17:00:00Z" }));
    expect(mismatches.map((m) => m.field)).toEqual(["period"]);
  });

  it("flags a different origin", () => {
    const mismatches = findComparisonMismatches(profile(), profile({ origin: "public_dataset" }));
    expect(mismatches.map((m) => m.field)).toEqual(["origin"]);
  });

  it("flags incompatible methods", () => {
    const other = profile({
      series: [
        {
          producerId: "11111111-1111-4111-8111-111111111111",
          method: "other_method",
          calibrationStatus: "unknown",
          bins: [],
        },
      ],
    });
    const mismatches = findComparisonMismatches(profile(), other);
    expect(mismatches.map((m) => m.field)).toEqual(["method"]);
  });

  it("never ranks comfort, only compares shape", () => {
    const mismatches = findComparisonMismatches(profile({ laeqDbA: 90 }), profile({ laeqDbA: 10 }));
    expect(mismatches).toEqual([]);
  });
});

describe("describeCoverage", () => {
  it("reports no observations for no_data status", () => {
    expect(describeCoverage(profile({ status: "no_data", series: [] }))).toBe(
      "No observations in the requested period.",
    );
  });

  it("sums observed seconds and sessions across bins", () => {
    expect(describeCoverage(profile())).toBe("10s observed across 1 session(s).");
  });
});
