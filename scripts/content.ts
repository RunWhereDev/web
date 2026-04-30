import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import { z } from "zod";
import type { GpuSpec, ModelRecord } from "../shared/types";

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

async function readYamlFile<T>(filePath: string, schema: z.ZodType<T>) {
  const raw = await readFile(filePath, "utf8");
  return schema.parse(yaml.load(raw));
}

async function readYamlDir<T>(dir: string, schema: z.ZodType<T>) {
  const entries = await readdir(dir);
  const files = entries.filter((entry) => entry.endsWith(".yaml")).sort();

  return Promise.all(files.map((file) => readYamlFile(path.join(dir, file), schema)));
}

export function projectPath(...segments: string[]) {
  return path.join(process.cwd(), ...segments);
}

export function loadModels() {
  return readYamlDir<ModelRecord>(projectPath("src/content/models"), modelSchema);
}

export function loadGpuSpecs() {
  return readYamlDir<GpuSpec>(projectPath("src/content/gpu-specs"), gpuSpecSchema);
}
