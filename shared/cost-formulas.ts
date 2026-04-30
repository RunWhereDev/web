import type { ApiCostInput, CostAssumptions, Quantization, SelfHostCostInput } from "./types";

export const DEFAULT_ASSUMPTIONS: CostAssumptions = {
  utilization: 0.6,
  fteFraction: 0.1,
  annualSalaryUsd: 150_000,
  inputShare: 0.7,
  outputShare: 0.3,
  peakToAvgRatio: 3,
  int8ThroughputMultiplier: 1.7,
  int4ThroughputMultiplier: 2.5,
  overheadEnabled: false
};

const MONTHLY_HOURS = 24 * 30;
const OVERHEAD_MULTIPLIER = 1.08;

export function operationalLaborMonthlyUsd(
  fteFraction = DEFAULT_ASSUMPTIONS.fteFraction,
  annualSalaryUsd = DEFAULT_ASSUMPTIONS.annualSalaryUsd
) {
  return (fteFraction * annualSalaryUsd) / 12;
}

export function selfHostMonthlyUsd({ gpuPriceHourlyUsd, gpuCount, assumptions }: SelfHostCostInput) {
  if (gpuCount <= 0 || gpuPriceHourlyUsd < 0 || assumptions.utilization <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  const infrastructure = (gpuPriceHourlyUsd * gpuCount * MONTHLY_HOURS) / assumptions.utilization;
  const labor = operationalLaborMonthlyUsd(assumptions.fteFraction, assumptions.annualSalaryUsd);
  const base = infrastructure + labor;

  return assumptions.overheadEnabled ? base * OVERHEAD_MULTIPLIER : base;
}

export function apiMonthlyUsd({ tokensPerDay, priceInputPerMtokUsd, priceOutputPerMtokUsd, assumptions }: ApiCostInput) {
  const monthlyMtok = (tokensPerDay * 30) / 1_000_000;
  const blendedPrice =
    assumptions.inputShare * priceInputPerMtokUsd + assumptions.outputShare * priceOutputPerMtokUsd;

  return monthlyMtok * blendedPrice;
}

export function crossoverTokensPerDay(selfHostMonthly: number, priceInputPerMtokUsd: number, priceOutputPerMtokUsd: number, assumptions = DEFAULT_ASSUMPTIONS) {
  const blendedPrice =
    assumptions.inputShare * priceInputPerMtokUsd + assumptions.outputShare * priceOutputPerMtokUsd;

  if (!Number.isFinite(selfHostMonthly) || blendedPrice <= 0) {
    return null;
  }

  return (selfHostMonthly / blendedPrice / 30) * 1_000_000;
}

export function quantizationBytesPerParam(quantization: Quantization) {
  if (quantization === "int4") return 0.5;
  if (quantization === "int8") return 1;
  return 2;
}

export function quantizationThroughputMultiplier(quantization: Quantization, assumptions = DEFAULT_ASSUMPTIONS) {
  if (quantization === "int4") return assumptions.int4ThroughputMultiplier;
  if (quantization === "int8") return assumptions.int8ThroughputMultiplier;
  return 1;
}

export function peakTokensPerSecond(tokensPerDay: number, peakToAvgRatio = DEFAULT_ASSUMPTIONS.peakToAvgRatio) {
  return (tokensPerDay / 86_400) * peakToAvgRatio;
}
