import { describe, expect, it } from "vitest";
import {
  DEFAULT_ASSUMPTIONS,
  apiMonthlyUsd,
  crossoverTokensPerDay,
  operationalLaborMonthlyUsd,
  peakTokensPerSecond,
  selfHostMonthlyUsd
} from "../cost-formulas";

describe("cost formulas", () => {
  it("computes operational labor from FTE fraction", () => {
    expect(operationalLaborMonthlyUsd(0.1, 150_000)).toBe(1_250);
  });

  it("computes self-host monthly cost with utilization and labor", () => {
    expect(
      selfHostMonthlyUsd({
        gpuPriceHourlyUsd: 10,
        gpuCount: 2,
        assumptions: DEFAULT_ASSUMPTIONS
      })
    ).toBeCloseTo(25_250, 0);
  });

  it("computes API monthly cost from blended token prices", () => {
    expect(
      apiMonthlyUsd({
        tokensPerDay: 10_000_000,
        priceInputPerMtokUsd: 2,
        priceOutputPerMtokUsd: 8,
        assumptions: DEFAULT_ASSUMPTIONS
      })
    ).toBeCloseTo(1_140);
  });

  it("solves the crossover point in tokens per day", () => {
    expect(crossoverTokensPerDay(1_140, 2, 8, DEFAULT_ASSUMPTIONS)).toBeCloseTo(10_000_000);
  });

  it("converts workload shape to peak tokens per second", () => {
    expect(peakTokensPerSecond(86_400, 3)).toBe(3);
  });
});
