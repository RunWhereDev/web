import type { CloudGpu, CloudSlug, CostAssumptions, Quantization, UsageShape } from "../shared/types";
import { DEFAULT_ASSUMPTIONS } from "../shared/cost-formulas";

export const RULESET_VERSION = "1.1.0";
export const DEFAULT_GENERATED_AT = "2026-04-29T03:00:00.000Z";

export const CLOUDS: Array<{ slug: CloudSlug; name: string; gpu_count: number }> = [
  { slug: "gcp", name: "Google Cloud", gpu_count: 4 },
  { slug: "aws", name: "AWS", gpu_count: 4 },
  { slug: "azure", name: "Azure", gpu_count: 4 }
];

export const SHAPES: Array<{ slug: UsageShape; label: string; tokens_per_day: number; persona: string }> = [
  { slug: "light", label: "Light", tokens_per_day: 1_000_000, persona: "Side project, internal tooling" },
  { slug: "medium", label: "Medium", tokens_per_day: 10_000_000, persona: "Mid-stage SaaS, regular workload" },
  { slug: "heavy", label: "Heavy", tokens_per_day: 100_000_000, persona: "Production at scale" }
];

export const QUANTIZATIONS: Quantization[] = ["fp16", "int8", "int4"];

export const DEFAULTS: CostAssumptions = DEFAULT_ASSUMPTIONS;

export const CLOUD_GPU_CATALOG: Record<CloudSlug, CloudGpu[]> = {
  gcp: [
    { sku: "h100-80g", instance_type: "a3-highgpu-8g", price_hourly_usd: 9.85, max_gpus: 8 },
    { sku: "a100-80g", instance_type: "a2-ultragpu-1g", price_hourly_usd: 4.1, max_gpus: 1 },
    { sku: "a100-40g", instance_type: "a2-highgpu-1g", price_hourly_usd: 2.95, max_gpus: 1 },
    { sku: "l4", instance_type: "g2-standard-12", price_hourly_usd: 0.74, max_gpus: 1 }
  ],
  aws: [
    { sku: "h100-80g", instance_type: "p5.48xlarge", price_hourly_usd: 12.3, max_gpus: 8 },
    { sku: "a100-80g", instance_type: "p4de.24xlarge", price_hourly_usd: 5.2, max_gpus: 8 },
    { sku: "l40s", instance_type: "g6e.xlarge", price_hourly_usd: 1.68, max_gpus: 1 },
    { sku: "a10g", instance_type: "g5.xlarge", price_hourly_usd: 1.01, max_gpus: 1 }
  ],
  azure: [
    { sku: "h100-80g", instance_type: "Standard_ND96isr_H100_v5", price_hourly_usd: 10.95, max_gpus: 8 },
    { sku: "a100-80g", instance_type: "Standard_ND96amsr_A100_v4", price_hourly_usd: 4.75, max_gpus: 8 },
    { sku: "a100-40g", instance_type: "Standard_NC96ads_A100_v4", price_hourly_usd: 3.35, max_gpus: 4 },
    { sku: "t4", instance_type: "Standard_NC4as_T4_v3", price_hourly_usd: 0.52, max_gpus: 1 }
  ]
};

export const API_MODEL_DEFAULTS: Record<
  string,
  {
    providers_count: number;
    price_input_per_mtok_usd: number;
    price_output_per_mtok_usd: number;
    throughput_p50_tps: number;
    throughput_p90_tps: number;
  }
> = {
  "llama-4-maverick": {
    providers_count: 5,
    price_input_per_mtok_usd: 2.5,
    price_output_per_mtok_usd: 7.5,
    throughput_p50_tps: 380,
    throughput_p90_tps: 520
  },
  "llama-4-scout": {
    providers_count: 4,
    price_input_per_mtok_usd: 1.2,
    price_output_per_mtok_usd: 3.6,
    throughput_p50_tps: 430,
    throughput_p90_tps: 590
  },
  "qwen-3-5": {
    providers_count: 4,
    price_input_per_mtok_usd: 1.6,
    price_output_per_mtok_usd: 5.2,
    throughput_p50_tps: 360,
    throughput_p90_tps: 500
  },
  "qwen-3-coder-480b": {
    providers_count: 3,
    price_input_per_mtok_usd: 2.1,
    price_output_per_mtok_usd: 6.8,
    throughput_p50_tps: 310,
    throughput_p90_tps: 450
  },
  "deepseek-v3-2": {
    providers_count: 5,
    price_input_per_mtok_usd: 1.9,
    price_output_per_mtok_usd: 6.1,
    throughput_p50_tps: 330,
    throughput_p90_tps: 470
  },
  "mistral-large-3": {
    providers_count: 3,
    price_input_per_mtok_usd: 2.3,
    price_output_per_mtok_usd: 7.2,
    throughput_p50_tps: 300,
    throughput_p90_tps: 430
  },
  "mistral-small-4": {
    providers_count: 4,
    price_input_per_mtok_usd: 0.45,
    price_output_per_mtok_usd: 1.35,
    throughput_p50_tps: 650,
    throughput_p90_tps: 820
  },
  "gemma-4-26b": {
    providers_count: 4,
    price_input_per_mtok_usd: 0.55,
    price_output_per_mtok_usd: 1.7,
    throughput_p50_tps: 720,
    throughput_p90_tps: 920
  },
  "glm-5-1": {
    providers_count: 3,
    price_input_per_mtok_usd: 1.8,
    price_output_per_mtok_usd: 5.8,
    throughput_p50_tps: 320,
    throughput_p90_tps: 460
  },
  "nemotron-cascade-2": {
    providers_count: 2,
    price_input_per_mtok_usd: 0.65,
    price_output_per_mtok_usd: 1.95,
    throughput_p50_tps: 900,
    throughput_p90_tps: 1_200
  },
  "phi-4": {
    providers_count: 5,
    price_input_per_mtok_usd: 0.12,
    price_output_per_mtok_usd: 0.38,
    throughput_p50_tps: 1_000,
    throughput_p90_tps: 1_350
  },
  "kimi-k2-5": {
    providers_count: 2,
    price_input_per_mtok_usd: 2.4,
    price_output_per_mtok_usd: 7.4,
    throughput_p50_tps: 280,
    throughput_p90_tps: 400
  }
};

export function fallbackApiDefaults() {
  return {
    providers_count: 1,
    price_input_per_mtok_usd: 1,
    price_output_per_mtok_usd: 3,
    throughput_p50_tps: 300,
    throughput_p90_tps: 450
  };
}
