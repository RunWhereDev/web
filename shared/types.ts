export type CloudSlug = "gcp" | "aws" | "azure";
export type Quantization = "fp16" | "int8" | "int4";
export type UsageShape = "light" | "medium" | "heavy";
export type Regime = "self-host-wins" | "api-wins" | "close-call";
export type ProvenanceLabel = "calculated" | "cited" | "measured";

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

export interface GpuSpec {
  sku: string;
  name: string;
  memory_gb: number;
  bandwidth_gbps: number;
  generation_rank: number;
}

export interface CloudGpu {
  sku: string;
  instance_type: string;
  price_hourly_usd: number;
  max_gpus: number;
}

export interface ModelRecord {
  slug: string;
  name: string;
  family: string;
  vendor: string;
  license: "apache-2.0" | "mit" | "llama-community" | "other";
  hf_id: string;
  openrouter_slug: string;
  architecture: "dense" | "moe" | "hybrid";
  params_b: number;
  active_params_b: number;
  tier: "stable" | "preview" | "archived";
  added: string;
  one_liner: string;
  inclusion_rationale: string;
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
  peak_tokens_per_second: number;
}

export interface CompositionResult {
  self_host_monthly_usd: number | null;
  api_monthly_usd: number;
  regime: Regime;
  ratio: number | null;
  crossover_tokens_per_day: number | null;
  crossover_series: Array<{
    tokens_per_day: number;
    self_host_usd: number | null;
    api_usd: number;
  }>;
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
  };
  compositions: Record<string, CompositionResult>;
  provenance: Record<string, { label: ProvenanceLabel; source: string; url: string }>;
}
