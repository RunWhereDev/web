import type { ApiMappingRecord, ModelRecord, ServingModalityRecord } from "./content-schemas";

export type { ApiMappingRecord, GpuSpec, ModelRecord, ServingModalityRecord } from "./content-schemas";

export type CloudSlug = "gcp" | "aws" | "azure";
export type Quantization = "fp16" | "int8" | "int4";
export type UsageShape = "light" | "medium" | "heavy";
export type Regime = "self-host-wins" | "api-wins" | "close-call";
export type ProvenanceLabel = "calculated" | "cited" | "measured";
export type SpendBand = "lt_200" | "200_to_2k" | "2k_to_10k" | "gt_10k";
export type TrafficShape = "bursty" | "steady" | "batch";
export type HardConstraint = "data_residency" | "air_gap" | "latency_sub_100ms_p99";
export type PrimaryOutcome = "confirmed_api" | "may_be_exception" | "hard_constraint" | "insufficient_data";
export type CandidateSizeClass = ApiMappingRecord["size_class"];
export type ServingModalitySlug = ServingModalityRecord["slug"];
export type OperationalEffort = ServingModalityRecord["operational_effort"];
export type ServingFitStatus = "recommended" | "possible" | "baseline" | "not_a_fit" | "advisory";

export interface CostAssumptions {
  utilization: number;
  fteFraction: number;
  annualSalaryUsd: number;
  inputShare: number;
  outputShare: number;
  peakToAvgRatio: number;
  int8ThroughputMultiplier: number;
  int4ThroughputMultiplier: number;
  overheadEnabled: boolean;
}

export interface SelfHostCostInput {
  gpuPriceHourlyUsd: number;
  gpuCount: number;
  assumptions: Pick<CostAssumptions, "utilization" | "fteFraction" | "annualSalaryUsd" | "overheadEnabled">;
}

export interface ApiCostInput {
  tokensPerDay: number;
  priceInputPerMtokUsd: number;
  priceOutputPerMtokUsd: number;
  assumptions: Pick<CostAssumptions, "inputShare" | "outputShare">;
}

export interface ManagedEndpointCostInput {
  acceleratorInstanceHourlyUsd: number;
  provisionedInstances: number;
  managedServicePremiumMonthlyUsd: number;
  assumptions: Pick<CostAssumptions, "fteFraction" | "annualSalaryUsd">;
  opsLaborFteFraction?: number;
}

export interface ServerlessGpuCostInput {
  outputTokensMonthly: number;
  perGpuOutputTps: number;
  gpuPricePerSecondUsd: number;
  coldStartsMonthly: number;
  coldStartPaddingSeconds?: number;
  requestOverheadMonthlyUsd?: number;
  assumptions: Pick<CostAssumptions, "annualSalaryUsd">;
  opsLaborFteFraction?: number;
}

export interface BatchGpuCostInput {
  gpuPriceHourlyUsd: number;
  gpusNeeded: number;
  activeJobHoursMonthly: number;
  orchestrationOverheadMonthlyUsd?: number;
  assumptions: Pick<CostAssumptions, "annualSalaryUsd">;
  opsLaborFteFraction?: number;
}

export interface OwnedHardwareCostInput {
  hardwarePurchasePriceUsd: number;
  amortizationMonths?: number;
  monthlyPowerKwh: number;
  electricityPricePerKwhUsd: number;
  pue?: number;
  coloOrSpaceMonthlyUsd?: number;
  maintenanceMonthlyUsd?: number;
  assumptions: Pick<CostAssumptions, "annualSalaryUsd">;
  opsLaborFteFraction?: number;
}

export interface CloudGpu {
  sku: string;
  instance_type: string;
  price_hourly_usd: number;
  max_gpus: number;
}

export interface CompositionInputs {
  gpu_sku: string;
  gpu_name: string;
  instance_type: string;
  gpu_price_hourly_usd: number;
  gpu_count: number;
  gpu_max_count: number;
  gpu_memory_gb: number;
  vram_required_gb: number;
  vram_available_gb: number;
  self_host_throughput_tps: number;
  self_host_throughput_tps_per_gpu: number;
  quantization: Quantization;
  shape: UsageShape;
  tokens_per_day: number;
  output_tokens_per_day: number;
  peak_tokens_per_second: number;
  peak_output_tokens_per_second: number;
}

export interface CompositionResult {
  self_host_monthly_usd: number | null;
  api_monthly_usd: number;
  cost_regime: Regime;
  regime: Regime;
  ratio: number | null;
  crossover_tokens_per_day: number | null;
  crossover_series: Array<{
    tokens_per_day: number;
    self_host_usd: number | null;
    api_usd: number;
    gpu_count: number;
    fits: boolean;
  }>;
  api_capacity: {
    aggregate_p50_tps: number;
    required_peak_output_tps: number;
    constrained: boolean;
  };
  fits: boolean;
  reason?: string;
  inputs: CompositionInputs;
}

export interface Artifact {
  artifact: {
    id: string;
    model_slug: string;
    cloud: CloudSlug;
    generated_at: string;
    tier: ModelRecord["tier"];
    ruleset_version: string;
    source_commits: Record<string, string>;
  };
  model_facts: {
    name: string;
    family: string;
    vendor: string;
    params_b: number;
    active_params_b: number;
    architecture: ModelRecord["architecture"];
    file_bytes_fp16: number;
    license: ModelRecord["license"];
    hf_id: string;
  };
  api_side: {
    providers_count: number;
    price_input_per_mtok_usd: number;
    price_output_per_mtok_usd: number;
    throughput_p50_tps: number;
    throughput_p90_tps: number;
  };
  defaults: {
    gpu_sku: string;
    quantization: Quantization;
    shape: UsageShape;
  };
  options: {
    gpus: CloudGpu[];
    quantizations: Quantization[];
    shapes: Array<{
      slug: UsageShape;
      label: string;
      tokens_per_day: number;
      persona: string;
    }>;
    assumptions: CostAssumptions;
    regime_threshold: number;
  };
  compositions: Record<string, CompositionResult>;
  provenance: Record<string, { label: ProvenanceLabel; source: string; url: string }>;
}

export interface CheckProfile {
  ruleset_version: string;
  spend_band: SpendBand;
  hosted_model: string;
  traffic_shape: TrafficShape;
  hard_constraints: HardConstraint[];
  candidate_open_weight_model?: string;
}

export interface ExceptionRule {
  id: string;
  when: Partial<{
    spend_band: SpendBand;
    traffic_shape: TrafficShape;
    candidate_size: CandidateSizeClass;
    hosted_model: string;
    hard_constraint: HardConstraint;
  }>;
  outcome: Exclude<PrimaryOutcome, "confirmed_api">;
  preferred_modalities: ServingModalitySlug[];
  rationale: string;
}

export interface ReferenceProfile {
  id: string;
  label: string;
  weight: number;
  profile: Omit<CheckProfile, "ruleset_version">;
}

export interface CheckBoundaryArtifact {
  artifact: {
    id: string;
    generated_at: string;
    ruleset_version: string;
    source_commits: Record<string, string>;
  };
  headline: {
    api_first_rate: number;
    label: string;
    methodology_url: string;
  };
  spend_bands: SpendBand[];
  traffic_shapes: TrafficShape[];
  hard_constraints: HardConstraint[];
  api_models: Array<Pick<ApiMappingRecord, "slug" | "name" | "vendor" | "family" | "size_class" | "typical_price_source" | "mapped_open_weight_candidates" | "quality_caveat">>;
  serving_modalities: ServingModalitySlug[];
  serving_modality_details: ServingModalityRecord[];
  exception_rules: ExceptionRule[];
  reference_profiles: ReferenceProfile[];
}

export interface CheckEvaluation {
  outcome: PrimaryOutcome;
  label: string;
  summary: string;
  mapped_api_model?: CheckBoundaryArtifact["api_models"][number];
  matched_rules: ExceptionRule[];
  preferred_modalities: ServingModalitySlug[];
  what_would_change: string[];
  ruleset_mismatch: boolean;
}

export interface ServingOptionRow {
  slug: ServingModalitySlug;
  label: string;
  target: string;
  monthly_estimate: string;
  fit_status: ServingFitStatus;
  operational_effort: OperationalEffort;
  why: string;
}
