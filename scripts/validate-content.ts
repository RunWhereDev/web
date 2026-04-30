import { readFile } from "node:fs/promises";
import { CLOUDS, CLOUD_GPU_CATALOG } from "./catalog";
import { loadGpuSpecs, loadModels, projectPath } from "./content";

const models = await loadModels();
const gpuSpecs = await loadGpuSpecs();
const gpuSkus = new Set(gpuSpecs.map((gpu) => gpu.sku));
const slugs = new Set<string>();

for (const model of models) {
  if (slugs.has(model.slug)) {
    throw new Error(`Duplicate model slug: ${model.slug}`);
  }
  slugs.add(model.slug);

  if (model.active_params_b > model.params_b) {
    throw new Error(`${model.slug} has active_params_b greater than params_b`);
  }
}

for (const cloud of CLOUDS) {
  for (const gpu of CLOUD_GPU_CATALOG[cloud.slug]) {
    if (!gpuSkus.has(gpu.sku)) {
      throw new Error(`${cloud.slug} references missing GPU spec ${gpu.sku}`);
    }
  }
}

await readFile(projectPath("docs/SPEC.md"), "utf8");
await readFile(projectPath("docs/BRAND.md"), "utf8");
await readFile(projectPath("docs/MODELS.md"), "utf8");
await readFile(projectPath("docs/OPERATIONS.md"), "utf8");

console.log(`Validated ${models.length} models and ${gpuSpecs.length} GPU specs.`);
