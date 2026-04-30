import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import { z } from "zod";
import {
  apiMappingSchema,
  gpuSpecSchema,
  modelSchema,
  servingModalitySchema,
  type ApiMappingRecord,
  type GpuSpec,
  type ModelRecord,
  type ServingModalityRecord
} from "../shared/content-schemas";

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

export function loadApiMappings() {
  return readYamlDir<ApiMappingRecord>(projectPath("src/content/api-mappings"), apiMappingSchema);
}

export async function loadServingModalities() {
  const modalities = await readYamlDir<ServingModalityRecord>(
    projectPath("src/content/serving-modalities"),
    servingModalitySchema
  );
  return modalities.sort((a, b) => a.sort_order - b.sort_order);
}
