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

export type ModelRecord = z.infer<typeof modelSchema>;
export type GpuSpec = z.infer<typeof gpuSpecSchema>;
