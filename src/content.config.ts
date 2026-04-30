import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const models = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/models" }),
  schema: z.object({
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
  })
});

const gpuSpecs = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/gpu-specs" }),
  schema: z.object({
    sku: z.string().min(1),
    name: z.string().min(1),
    memory_gb: z.number().positive(),
    bandwidth_gbps: z.number().positive(),
    generation_rank: z.number().int().positive()
  })
});

export const collections = {
  models,
  "gpu-specs": gpuSpecs
};
