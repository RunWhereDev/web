import { CLOUDS, CLOUD_GPU_CATALOG } from "./catalog";
import { loadApiMappings, loadGpuSpecs, loadModels, loadServingModalities } from "./content";

const models = await loadModels();
const gpuSpecs = await loadGpuSpecs();
const apiMappings = await loadApiMappings();
const servingModalities = await loadServingModalities();
const gpuSkus = new Set(gpuSpecs.map((gpu) => gpu.sku));
const modelSlugs = new Set<string>();
const apiMappingSlugs = new Set<string>();
const servingModalitySlugs = new Set<string>();
const expectedServingModalities = new Set(["api", "managed-endpoint", "serverless-gpu", "vm-cheap", "vm-serious", "batch-gpu", "owned-hardware"]);

for (const model of models) {
  if (modelSlugs.has(model.slug)) {
    throw new Error(`Duplicate model slug: ${model.slug}`);
  }
  modelSlugs.add(model.slug);

  if (model.active_params_b > model.params_b) {
    throw new Error(`${model.slug} has active_params_b greater than params_b`);
  }
}

for (const mapping of apiMappings) {
  if (apiMappingSlugs.has(mapping.slug)) {
    throw new Error(`Duplicate API mapping slug: ${mapping.slug}`);
  }
  apiMappingSlugs.add(mapping.slug);

  for (const candidate of mapping.mapped_open_weight_candidates) {
    if (!modelSlugs.has(candidate)) {
      throw new Error(`${mapping.slug} references missing open-weight model ${candidate}`);
    }
  }
}

for (const modality of servingModalities) {
  if (servingModalitySlugs.has(modality.slug)) {
    throw new Error(`Duplicate serving modality slug: ${modality.slug}`);
  }
  servingModalitySlugs.add(modality.slug);
}

for (const expected of expectedServingModalities) {
  if (!servingModalitySlugs.has(expected)) {
    throw new Error(`Missing serving modality ${expected}`);
  }
}

for (const cloud of CLOUDS) {
  for (const gpu of CLOUD_GPU_CATALOG[cloud.slug]) {
    if (!gpuSkus.has(gpu.sku)) {
      throw new Error(`${cloud.slug} references missing GPU spec ${gpu.sku}`);
    }
  }
}

console.log(
  `Validated ${models.length} models, ${gpuSpecs.length} GPU specs, ${apiMappings.length} API mappings, and ${servingModalities.length} serving modalities.`
);
