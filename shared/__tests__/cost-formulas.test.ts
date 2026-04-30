import { describe, expect, it } from "vitest";
import {
  DEFAULT_ASSUMPTIONS,
  apiMonthlyUsd,
  batchGpuMonthlyUsd,
  crossoverTokensPerDay,
  managedEndpointMonthlyUsd,
  ownedHardwareMonthlyUsd,
  operationalLaborMonthlyUsd,
  outputTokensPerDay,
  peakOutputTokensPerSecond,
  peakTokensPerSecond,
  selfHostMonthlyUsd,
  serverlessGpuMonthlyUsd
} from "../cost-formulas";

describe("cost formulas", () => {
  it("computes operational labor from FTE fraction", () => {
    expect(operationalLaborMonthlyUsd(0.1, 150_000)).toBe(1_250);
  });

  it("computes self-host monthly cost from rented GPU hours and labor", () => {
    expect(
      selfHostMonthlyUsd({
        gpuPriceHourlyUsd: 10,
        gpuCount: 2,
        assumptions: DEFAULT_ASSUMPTIONS
      })
    ).toBeCloseTo(15_650, 0);
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

  it("computes managed endpoint monthly cost from provisioned capacity, premium, and lower ops labor", () => {
    expect(
      managedEndpointMonthlyUsd({
        acceleratorInstanceHourlyUsd: 4,
        provisionedInstances: 2,
        managedServicePremiumMonthlyUsd: 500,
        assumptions: DEFAULT_ASSUMPTIONS
      })
    ).toBeCloseTo(6_885);
  });

  it("computes serverless GPU monthly cost from active seconds and cold starts", () => {
    expect(
      serverlessGpuMonthlyUsd({
        outputTokensMonthly: 3_000_000,
        perGpuOutputTps: 100,
        gpuPricePerSecondUsd: 0.001,
        coldStartsMonthly: 100,
        assumptions: DEFAULT_ASSUMPTIONS
      })
    ).toBeCloseTo(407);
  });

  it("computes batch GPU monthly cost from active job hours", () => {
    expect(
      batchGpuMonthlyUsd({
        gpuPriceHourlyUsd: 2,
        gpusNeeded: 2,
        activeJobHoursMonthly: 50,
        orchestrationOverheadMonthlyUsd: 100,
        assumptions: DEFAULT_ASSUMPTIONS
      })
    ).toBeCloseTo(800);
  });

  it("computes owned hardware monthly equivalent when assumptions are explicit", () => {
    expect(
      ownedHardwareMonthlyUsd({
        hardwarePurchasePriceUsd: 36_000,
        monthlyPowerKwh: 1_000,
        electricityPricePerKwhUsd: 0.1,
        coloOrSpaceMonthlyUsd: 500,
        maintenanceMonthlyUsd: 200,
        assumptions: DEFAULT_ASSUMPTIONS
      })
    ).toBeCloseTo(3_320);
  });

  it("solves the crossover point in tokens per day", () => {
    expect(crossoverTokensPerDay(1_140, 2, 8, DEFAULT_ASSUMPTIONS)).toBeCloseTo(10_000_000);
  });

  it("converts workload shape to peak tokens per second", () => {
    expect(peakTokensPerSecond(86_400, 3)).toBe(3);
  });

  it("uses output-token share for decode capacity pressure", () => {
    expect(outputTokensPerDay(10_000_000, 0.3)).toBe(3_000_000);
    expect(peakOutputTokensPerSecond(86_400, DEFAULT_ASSUMPTIONS)).toBeCloseTo(0.9);
  });
});
