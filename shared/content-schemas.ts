import { z } from "zod";

export const modelSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  family: z.string().min(1),
  vendor: z.string().min(1),
  license: z.enum(["apache-2.0", "mit", "llama-community", "other"]),
  hf_id: z.string().min(1),
  openrouter_slug: z.string().min(1),
  architecture: z.enum(["dense", "moe", "hybrid"]),
  params_b: z.number().positive(),
  active_params_b: z.number().positive(),
  tier: z.enum(["stable", "preview", "archived"]),
  added: z.string().min(1),
  one_liner: z.string().max(120),
  inclusion_rationale: z.string().min(1)
});

export const gpuSpecSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  memory_gb: z.number().positive(),
  bandwidth_gbps: z.number().positive(),
  generation_rank: z.number().int().positive()
});

export const apiMappingSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  vendor: z.string().min(1),
  family: z.string().min(1),
  size_class: z.enum(["small", "medium", "frontier"]),
  typical_price_source: z.string().min(1).optional(),
  mapped_open_weight_candidates: z.array(z.string().min(1)).min(1),
  quality_caveat: z.string().min(1),
  inclusion_rationale: z.string().min(1)
});

export const servingModalitySchema = z.object({
  slug: z.enum([
    "api",
    "managed-endpoint",
    "serverless-gpu",
    "vm-cheap",
    "vm-serious",
    "batch-gpu",
    "owned-hardware"
  ]),
  label: z.string().min(1),
  description: z.string().min(1),
  pricing_model: z.string().min(1),
  best_fit: z.string().min(1),
  v1_treatment: z.enum(["modeled", "preview", "advisory", "excluded"]),
  operational_effort: z.enum(["Low", "Medium", "High"]),
  sort_order: z.number().int().nonnegative()
});

export type ModelRecord = z.infer<typeof modelSchema>;
export type GpuSpec = z.infer<typeof gpuSpecSchema>;
export type ApiMappingRecord = z.infer<typeof apiMappingSchema>;
export type ServingModalityRecord = z.infer<typeof servingModalitySchema>;
