import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { apiMonthlyUsd, crossoverTokensPerDay, peakTokensPerSecond, selfHostMonthlyUsd } from "../shared/cost-formulas";
import { classifyRegime, costRatio } from "../shared/regime-classifier";
import { estimatePerGpuThroughputTps, vramRequiredGb } from "../shared/throughput-estimator";
import type { Artifact, CloudGpu, CloudSlug, CompositionResult, GpuSpec, ModelRecord, Quantization, UsageShape } from "../shared/types";
import {
  API_MODEL_DEFAULTS,
  CLOUD_GPU_CATALOG,
  CLOUDS,
  DEFAULT_GENERATED_AT,
  DEFAULTS,
  QUANTIZATIONS,
  RULESET_VERSION,
  SHAPES,
  fallbackApiDefaults
} from "./catalog";
import { loadGpuSpecs, loadModels, projectPath } from "./content";

const GENERATED_AT = process.env.RUNWHERE_GENERATED_AT || DEFAULT_GENERATED_AT;
const SOURCE_COMMIT = process.env.GITHUB_SHA?.slice(0, 8) || "local";

function compositionKey(gpuSku: string, quantization: Quantization, shape: UsageShape) {
  return `${gpuSku}__${quantization}__${shape}`;
}

function buildSeries(
  selfHostMonthly: number | null,
  priceInputPerMtokUsd: number,
  priceOutputPerMtokUsd: number
): CompositionResult["crossover_series"] {
  return [100_000, 1_000_000, 5_000_000, 10_000_000, 25_000_000, 100_000_000, 250_000_000].map(
    (tokensPerDay) => ({
      tokens_per_day: tokensPerDay,
      self_host_usd: selfHostMonthly,
      api_usd: Math.round(
        apiMonthlyUsd({
          tokensPerDay,
          priceInputPerMtokUsd,
          priceOutputPerMtokUsd,
          assumptions: DEFAULTS
        })
      )
    })
  );
}

function buildComposition(
  model: ModelRecord,
  cloudGpu: CloudGpu,
  gpuSpec: GpuSpec,
  quantization: Quantization,
  shape: (typeof SHAPES)[number],
  apiSide: Artifact["api_side"]
): CompositionResult {
  const vramRequired = vramRequiredGb(model, quantization);
  const vramGpuCount = Math.max(1, Math.ceil(vramRequired / gpuSpec.memory_gb));
  const perGpuThroughput = estimatePerGpuThroughputTps(gpuSpec.bandwidth_gbps, model, quantization, DEFAULTS);
  const peakTps = peakTokensPerSecond(shape.tokens_per_day, DEFAULTS.peakToAvgRatio);
  const capacityGpuCount = Math.max(1, Math.ceil(peakTps / perGpuThroughput));
  const gpuCount = Math.max(vramGpuCount, capacityGpuCount);
  const fits = gpuCount <= cloudGpu.max_gpus;
  const apiMonthly = apiMonthlyUsd({
    tokensPerDay: shape.tokens_per_day,
    priceInputPerMtokUsd: apiSide.price_input_per_mtok_usd,
    priceOutputPerMtokUsd: apiSide.price_output_per_mtok_usd,
    assumptions: DEFAULTS
  });
  const selfMonthly = fits
    ? selfHostMonthlyUsd({
        gpuPriceHourlyUsd: cloudGpu.price_hourly_usd,
        gpuCount,
        assumptions: DEFAULTS
      })
    : Number.POSITIVE_INFINITY;
  const regime = classifyRegime(selfMonthly, apiMonthly);
  const roundedSelf = fits ? Math.round(selfMonthly) : null;

  return {
    self_host_monthly_usd: roundedSelf,
    api_monthly_usd: Math.round(apiMonthly),
    regime,
    ratio: costRatio(selfMonthly, apiMonthly),
    crossover_tokens_per_day: crossoverTokensPerDay(selfMonthly, apiSide.price_input_per_mtok_usd, apiSide.price_output_per_mtok_usd, DEFAULTS),
    crossover_series: buildSeries(roundedSelf, apiSide.price_input_per_mtok_usd, apiSide.price_output_per_mtok_usd),
    fits,
    reason: fits
      ? undefined
      : `Needs ${gpuCount} ${gpuSpec.sku} GPUs for VRAM and peak traffic; ${cloudGpu.instance_type} exposes ${cloudGpu.max_gpus}.`,
    inputs: {
      gpu_sku: cloudGpu.sku,
      gpu_name: gpuSpec.name,
      instance_type: cloudGpu.instance_type,
      gpu_price_hourly_usd: cloudGpu.price_hourly_usd,
      gpu_count: fits ? gpuCount : cloudGpu.max_gpus,
      gpu_max_count: cloudGpu.max_gpus,
      gpu_memory_gb: gpuSpec.memory_gb,
      vram_required_gb: Math.round(vramRequired * 10) / 10,
      vram_available_gb: Math.round(gpuSpec.memory_gb * (fits ? gpuCount : cloudGpu.max_gpus) * 10) / 10,
      self_host_throughput_tps: Math.round(perGpuThroughput * (fits ? gpuCount : cloudGpu.max_gpus)),
      self_host_throughput_tps_per_gpu: Math.round(perGpuThroughput),
      quantization,
      shape: shape.slug,
      tokens_per_day: shape.tokens_per_day,
      peak_tokens_per_second: Math.round(peakTps)
    }
  };
}

function chooseDefaults(compositions: Record<string, CompositionResult>, cloudGpus: CloudGpu[]) {
  const fp16Medium = cloudGpus
    .map((gpu) => compositions[compositionKey(gpu.sku, "fp16", "medium")])
    .filter((composition) => composition?.fits)
    .sort((a, b) => a.self_host_monthly_usd! - b.self_host_monthly_usd!);

  const fallback = Object.values(compositions)
    .filter((composition) => composition.fits)
    .sort((a, b) => a.self_host_monthly_usd! - b.self_host_monthly_usd!);

  const chosen = fp16Medium[0] || fallback[0] || Object.values(compositions)[0];

  return {
    gpu_sku: chosen.inputs.gpu_sku,
    quantization: chosen.inputs.quantization,
    shape: "medium" as UsageShape
  };
}

function buildArtifact(model: ModelRecord, cloud: CloudSlug, gpuSpecs: Map<string, GpuSpec>): Artifact {
  const cloudGpus = CLOUD_GPU_CATALOG[cloud];
  const apiSide = API_MODEL_DEFAULTS[model.slug] || fallbackApiDefaults();
  const compositions: Artifact["compositions"] = {};

  for (const cloudGpu of cloudGpus) {
    const gpuSpec = gpuSpecs.get(cloudGpu.sku);
    if (!gpuSpec) {
      throw new Error(`Missing GPU spec for ${cloudGpu.sku}`);
    }

    for (const quantization of QUANTIZATIONS) {
      for (const shape of SHAPES) {
        compositions[compositionKey(cloudGpu.sku, quantization, shape.slug)] = buildComposition(
          model,
          cloudGpu,
          gpuSpec,
          quantization,
          shape,
          apiSide
        );
      }
    }
  }

  return {
    artifact: {
      id: `${model.slug}--${cloud}--v${RULESET_VERSION}-${SOURCE_COMMIT}`,
      model_slug: model.slug,
      cloud,
      generated_at: GENERATED_AT,
      tier: model.tier,
      ruleset_version: RULESET_VERSION,
      source_commits: {
        pricing: SOURCE_COMMIT,
        throughput: SOURCE_COMMIT,
        models: SOURCE_COMMIT
      }
    },
    model_facts: {
      name: model.name,
      family: model.family,
      vendor: model.vendor,
      params_b: model.params_b,
      active_params_b: model.active_params_b,
      architecture: model.architecture,
      file_bytes_fp16: model.params_b * 1_000_000_000 * 2,
      license: model.license,
      hf_id: model.hf_id
    },
    api_side: apiSide,
    defaults: chooseDefaults(compositions, cloudGpus),
    options: {
      gpus: cloudGpus,
      quantizations: QUANTIZATIONS,
      shapes: SHAPES,
      assumptions: DEFAULTS
    },
    compositions,
    provenance: {
      "model_facts.file_bytes_fp16": {
        label: "cited",
        source: "Hugging Face Hub model metadata",
        url: `https://huggingface.co/${model.hf_id}`
      },
      "api_side.price_input_per_mtok_usd": {
        label: "cited",
        source: "OpenRouter model catalog snapshot",
        url: "https://openrouter.ai/api/v1/models"
      },
      "api_side.throughput_p50_tps": {
        label: "measured",
        source: "OpenRouter endpoint throughput snapshot",
        url: "https://openrouter.ai/docs"
      },
      "compositions.*.inputs.gpu_price_hourly_usd": {
        label: "cited",
        source: "Cloud GPU pricing snapshot",
        url: "/methodology/#source-provenance"
      },
      "compositions.*.inputs.self_host_throughput_tps": {
        label: "calculated",
        source: "memory bandwidth divided by active parameter bytes, adjusted for quantization",
        url: "/methodology/#self-host-throughput"
      },
      "compositions.*.self_host_monthly_usd": {
        label: "calculated",
        source: "GPU hours at 60% utilization plus 0.1 FTE labor",
        url: "/methodology/#cost-formulas"
      },
      "compositions.*.regime": {
        label: "calculated",
        source: "1.5x regime threshold",
        url: "/methodology/#regime-thresholds"
      }
    }
  };
}

export async function buildArtifacts() {
  const models = (await loadModels()).filter((model) => model.tier !== "archived");
  const gpuSpecs = new Map((await loadGpuSpecs()).map((gpu) => [gpu.sku, gpu]));

  for (const model of models) {
    const modelDir = projectPath("src/data/generated/compositions", model.slug);
    await mkdir(modelDir, { recursive: true });

    for (const cloud of CLOUDS) {
      const artifact = buildArtifact(model, cloud.slug, gpuSpecs);
      await writeFile(path.join(modelDir, `${cloud.slug}.json`), `${JSON.stringify(artifact, null, 2)}\n`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await buildArtifacts();
}
