import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const models = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/models" }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    family: z.string(),
    vendor: z.string(),
    license: z.enum(["apache-2.0", "mit", "llama-community", "other"]),
    hf_id: z.string(),
    openrouter_slug: z.string(),
    architecture: z.enum(["dense", "moe", "hybrid"]),
    params_b: z.number(),
    active_params_b: z.number(),
    tier: z.enum(["stable", "preview", "archived"]),
    added: z.string(),
    one_liner: z.string(),
    inclusion_rationale: z.string()
  })
});

const gpuSpecs = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/gpu-specs" }),
  schema: z.object({
    sku: z.string(),
    name: z.string(),
    memory_gb: z.number(),
    bandwidth_gbps: z.number(),
    generation_rank: z.number()
  })
});

export const collections = {
  models,
  "gpu-specs": gpuSpecs
};
