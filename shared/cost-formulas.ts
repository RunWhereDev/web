import type {
  ApiCostInput,
  BatchGpuCostInput,
  CostAssumptions,
  ManagedEndpointCostInput,
  OwnedHardwareCostInput,
  Quantization,
  SelfHostCostInput,
  ServerlessGpuCostInput
} from "./types";

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
const DEFAULT_COLD_START_PADDING_SECONDS = 20;
const DEFAULT_SERVERLESS_OPS_FTE = 0.03;
const DEFAULT_BATCH_OPS_FTE = 0.04;
const DEFAULT_MANAGED_ENDPOINT_OPS_FTE = 0.05;
const DEFAULT_OWNED_HARDWARE_OPS_FTE = 0.12;
const DEFAULT_AMORTIZATION_MONTHS = 36;

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

  const infrastructure = gpuPriceHourlyUsd * gpuCount * MONTHLY_HOURS;
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

export function managedEndpointMonthlyUsd({
  acceleratorInstanceHourlyUsd,
  provisionedInstances,
  managedServicePremiumMonthlyUsd,
  assumptions,
  opsLaborFteFraction = DEFAULT_MANAGED_ENDPOINT_OPS_FTE
}: ManagedEndpointCostInput) {
  if (acceleratorInstanceHourlyUsd < 0 || provisionedInstances <= 0 || managedServicePremiumMonthlyUsd < 0) {
    return Number.POSITIVE_INFINITY;
  }

  return (
    acceleratorInstanceHourlyUsd * provisionedInstances * MONTHLY_HOURS +
    managedServicePremiumMonthlyUsd +
    operationalLaborMonthlyUsd(opsLaborFteFraction, assumptions.annualSalaryUsd)
  );
}

export function serverlessGpuMonthlyUsd({
  outputTokensMonthly,
  perGpuOutputTps,
  gpuPricePerSecondUsd,
  coldStartsMonthly,
  coldStartPaddingSeconds = DEFAULT_COLD_START_PADDING_SECONDS,
  requestOverheadMonthlyUsd = 0,
  assumptions,
  opsLaborFteFraction = DEFAULT_SERVERLESS_OPS_FTE
}: ServerlessGpuCostInput) {
  if (outputTokensMonthly < 0 || perGpuOutputTps <= 0 || gpuPricePerSecondUsd < 0 || coldStartsMonthly < 0) {
    return Number.POSITIVE_INFINITY;
  }

  const activeGpuSeconds = outputTokensMonthly / perGpuOutputTps;
  const coldStartSeconds = coldStartsMonthly * coldStartPaddingSeconds;

  return (
    (activeGpuSeconds + coldStartSeconds) * gpuPricePerSecondUsd +
    requestOverheadMonthlyUsd +
    operationalLaborMonthlyUsd(opsLaborFteFraction, assumptions.annualSalaryUsd)
  );
}

export function batchGpuMonthlyUsd({
  gpuPriceHourlyUsd,
  gpusNeeded,
  activeJobHoursMonthly,
  orchestrationOverheadMonthlyUsd = 0,
  assumptions,
  opsLaborFteFraction = DEFAULT_BATCH_OPS_FTE
}: BatchGpuCostInput) {
  if (gpuPriceHourlyUsd < 0 || gpusNeeded <= 0 || activeJobHoursMonthly < 0 || orchestrationOverheadMonthlyUsd < 0) {
    return Number.POSITIVE_INFINITY;
  }

  return (
    gpuPriceHourlyUsd * gpusNeeded * activeJobHoursMonthly +
    orchestrationOverheadMonthlyUsd +
    operationalLaborMonthlyUsd(opsLaborFteFraction, assumptions.annualSalaryUsd)
  );
}

export function ownedHardwareMonthlyUsd({
  hardwarePurchasePriceUsd,
  amortizationMonths = DEFAULT_AMORTIZATION_MONTHS,
  monthlyPowerKwh,
  electricityPricePerKwhUsd,
  pue = 1.2,
  coloOrSpaceMonthlyUsd = 0,
  maintenanceMonthlyUsd = 0,
  assumptions,
  opsLaborFteFraction = DEFAULT_OWNED_HARDWARE_OPS_FTE
}: OwnedHardwareCostInput) {
  if (
    hardwarePurchasePriceUsd < 0 ||
    amortizationMonths <= 0 ||
    monthlyPowerKwh < 0 ||
    electricityPricePerKwhUsd < 0 ||
    pue <= 0 ||
    coloOrSpaceMonthlyUsd < 0 ||
    maintenanceMonthlyUsd < 0
  ) {
    return Number.POSITIVE_INFINITY;
  }

  return (
    hardwarePurchasePriceUsd / amortizationMonths +
    monthlyPowerKwh * electricityPricePerKwhUsd * pue +
    coloOrSpaceMonthlyUsd +
    maintenanceMonthlyUsd +
    operationalLaborMonthlyUsd(opsLaborFteFraction, assumptions.annualSalaryUsd)
  );
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

export function outputTokensPerDay(tokensPerDay: number, outputShare = DEFAULT_ASSUMPTIONS.outputShare) {
  return tokensPerDay * outputShare;
}

export function peakOutputTokensPerSecond(tokensPerDay: number, assumptions = DEFAULT_ASSUMPTIONS) {
  return peakTokensPerSecond(outputTokensPerDay(tokensPerDay, assumptions.outputShare), assumptions.peakToAvgRatio);
}
