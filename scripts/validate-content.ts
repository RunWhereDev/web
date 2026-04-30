import { CLOUDS, CLOUD_GPU_CATALOG } from "./catalog";
import { loadGpuSpecs, loadModels } from "./content";

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

console.log(`Validated ${models.length} models and ${gpuSpecs.length} GPU specs.`);
