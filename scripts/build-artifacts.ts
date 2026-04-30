import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  apiMonthlyUsd,
  crossoverTokensPerDay,
  outputTokensPerDay,
  peakOutputTokensPerSecond,
  peakTokensPerSecond,
  selfHostMonthlyUsd
} from "../shared/cost-formulas";
import { CLEAR_WIN_RATIO, classifyRegime, costRatio } from "../shared/regime-classifier";
import { estimatePerGpuThroughputTps, vramRequiredGb } from "../shared/throughput-estimator";
import type {
  Artifact,
  CheckBoundaryArtifact,
  CloudGpu,
  CloudSlug,
  CompositionResult,
  GpuSpec,
  ModelRecord,
  Quantization,
  ServingModalitySlug,
  UsageShape
} from "../shared/types";
import {
  DEFAULT_EXCEPTION_RULES,
  HARD_CONSTRAINT_OPTIONS,
  REFERENCE_PROFILES,
  SPEND_BAND_OPTIONS,
  TRAFFIC_SHAPE_OPTIONS,
  computeHeadlineRate,
  headlineLabel
} from "../shared/check-boundary";
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
import { loadApiMappings, loadGpuSpecs, loadModels, loadServingModalities, projectPath } from "./content";

const GENERATED_AT = process.env.RUNWHERE_GENERATED_AT || DEFAULT_GENERATED_AT;
const SOURCE_COMMIT = process.env.GITHUB_SHA?.slice(0, 8) || "local";

function compositionKey(gpuSku: string, quantization: Quantization, shape: UsageShape) {
  return `${gpuSku}__${quantization}__${shape}`;
}

function buildSelfHostPlan(
  model: ModelRecord,
  cloudGpu: CloudGpu,
  gpuSpec: GpuSpec,
  quantization: Quantization,
  tokensPerDay: number
) {
  const vramRequired = vramRequiredGb(model, quantization);
  const vramGpuCount = Math.max(1, Math.ceil(vramRequired / gpuSpec.memory_gb));
  const perGpuThroughput = estimatePerGpuThroughputTps(gpuSpec.bandwidth_gbps, model, quantization, DEFAULTS);
  const peakTps = peakTokensPerSecond(tokensPerDay, DEFAULTS.peakToAvgRatio);
  const peakOutputTps = peakOutputTokensPerSecond(tokensPerDay, DEFAULTS);
  const capacityGpuCount = Math.max(1, Math.ceil(peakOutputTps / perGpuThroughput));
  const gpuCount = Math.max(vramGpuCount, capacityGpuCount);
  const fits = gpuCount <= cloudGpu.max_gpus;
  const selfMonthly = fits
    ? selfHostMonthlyUsd({
      gpuPriceHourlyUsd: cloudGpu.price_hourly_usd,
      gpuCount,
      assumptions: DEFAULTS
    })
    : Number.POSITIVE_INFINITY;

  return {
    vramRequired,
    vramGpuCount,
    perGpuThroughput,
    peakTps,
    peakOutputTps,
    capacityGpuCount,
    gpuCount,
    fits,
    selfMonthly
  };
}

function buildSeries(
  model: ModelRecord,
  cloudGpu: CloudGpu,
  gpuSpec: GpuSpec,
  quantization: Quantization,
  priceInputPerMtokUsd: number,
  priceOutputPerMtokUsd: number
): CompositionResult["crossover_series"] {
  return [100_000, 1_000_000, 5_000_000, 10_000_000, 25_000_000, 100_000_000, 250_000_000, 500_000_000, 1_000_000_000, 5_000_000_000].map(
    (tokensPerDay) => {
      const plan = buildSelfHostPlan(model, cloudGpu, gpuSpec, quantization, tokensPerDay);

      return {
        tokens_per_day: tokensPerDay,
        self_host_usd: plan.fits ? Math.round(plan.selfMonthly) : null,
        api_usd: Math.round(
          apiMonthlyUsd({
            tokensPerDay,
            priceInputPerMtokUsd,
            priceOutputPerMtokUsd,
            assumptions: DEFAULTS
          })
        ),
        gpu_count: plan.fits ? plan.gpuCount : cloudGpu.max_gpus,
        fits: plan.fits
      };
    }
  );
}

function buildApiCapacity(apiSide: Artifact["api_side"], peakOutputTps: number): CompositionResult["api_capacity"] {
  const aggregateP50Tps = apiSide.throughput_p50_tps * apiSide.providers_count;

  return {
    aggregate_p50_tps: aggregateP50Tps,
    required_peak_output_tps: Math.round(peakOutputTps),
    constrained: aggregateP50Tps > 0 && peakOutputTps > aggregateP50Tps
  };
}

function applyServingNuance(costRegime: CompositionResult["cost_regime"], fits: boolean, apiCapacity: CompositionResult["api_capacity"]) {
  if (costRegime === "api-wins" && fits && apiCapacity.constrained) {
    return "close-call";
  }

  return costRegime;
}

function buildComposition(
  model: ModelRecord,
  cloudGpu: CloudGpu,
  gpuSpec: GpuSpec,
  quantization: Quantization,
  shape: (typeof SHAPES)[number],
  apiSide: Artifact["api_side"]
): CompositionResult {
  const plan = buildSelfHostPlan(model, cloudGpu, gpuSpec, quantization, shape.tokens_per_day);
  const apiMonthly = apiMonthlyUsd({
    tokensPerDay: shape.tokens_per_day,
    priceInputPerMtokUsd: apiSide.price_input_per_mtok_usd,
    priceOutputPerMtokUsd: apiSide.price_output_per_mtok_usd,
    assumptions: DEFAULTS
  });
  const costRegime = classifyRegime(plan.selfMonthly, apiMonthly);
  const apiCapacity = buildApiCapacity(apiSide, plan.peakOutputTps);
  const regime = applyServingNuance(costRegime, plan.fits, apiCapacity);
  const roundedSelf = plan.fits ? Math.round(plan.selfMonthly) : null;

  return {
    self_host_monthly_usd: roundedSelf,
    api_monthly_usd: Math.round(apiMonthly),
    cost_regime: costRegime,
    regime,
    ratio: costRatio(plan.selfMonthly, apiMonthly),
    crossover_tokens_per_day: crossoverTokensPerDay(plan.selfMonthly, apiSide.price_input_per_mtok_usd, apiSide.price_output_per_mtok_usd, DEFAULTS),
    crossover_series: buildSeries(model, cloudGpu, gpuSpec, quantization, apiSide.price_input_per_mtok_usd, apiSide.price_output_per_mtok_usd),
    api_capacity: apiCapacity,
    fits: plan.fits,
    reason: plan.fits
      ? undefined
      : `Needs ${plan.gpuCount} ${gpuSpec.sku} GPUs for VRAM and peak output traffic; ${cloudGpu.instance_type} exposes ${cloudGpu.max_gpus}.`,
    inputs: {
      gpu_sku: cloudGpu.sku,
      gpu_name: gpuSpec.name,
      instance_type: cloudGpu.instance_type,
      gpu_price_hourly_usd: cloudGpu.price_hourly_usd,
      gpu_count: plan.fits ? plan.gpuCount : cloudGpu.max_gpus,
      gpu_max_count: cloudGpu.max_gpus,
      gpu_memory_gb: gpuSpec.memory_gb,
      vram_required_gb: Math.round(plan.vramRequired * 10) / 10,
      vram_available_gb: Math.round(gpuSpec.memory_gb * (plan.fits ? plan.gpuCount : cloudGpu.max_gpus) * 10) / 10,
      self_host_throughput_tps: Math.round(plan.perGpuThroughput * (plan.fits ? plan.gpuCount : cloudGpu.max_gpus)),
      self_host_throughput_tps_per_gpu: Math.round(plan.perGpuThroughput),
      quantization,
      shape: shape.slug,
      tokens_per_day: shape.tokens_per_day,
      output_tokens_per_day: Math.round(outputTokensPerDay(shape.tokens_per_day, DEFAULTS.outputShare)),
      peak_tokens_per_second: Math.round(plan.peakTps),
      peak_output_tokens_per_second: Math.round(plan.peakOutputTps)
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
      assumptions: DEFAULTS,
      regime_threshold: CLEAR_WIN_RATIO
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
        source: "memory bandwidth divided by active parameter bytes; capacity sized from output-token peak",
        url: "/methodology/#self-host-throughput"
      },
      "compositions.*.api_capacity": {
        label: "measured",
        source: "OpenRouter p50 throughput times provider count compared with peak output tokens/sec",
        url: "/methodology/#api-capacity"
      },
      "compositions.*.self_host_monthly_usd": {
        label: "calculated",
        source: "required GPU hours plus 0.1 FTE labor; utilization affects capacity sizing",
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

async function buildCheckBoundaryArtifact(): Promise<CheckBoundaryArtifact> {
  const apiMappings = await loadApiMappings();
  const servingModalities = await loadServingModalities();
  const boundaryWithoutRate: CheckBoundaryArtifact = {
    artifact: {
      id: `runwhere-boundaries--v${RULESET_VERSION}-${SOURCE_COMMIT}`,
      generated_at: GENERATED_AT,
      ruleset_version: RULESET_VERSION,
      source_commits: {
        pricing: SOURCE_COMMIT,
        throughput: SOURCE_COMMIT,
        models: SOURCE_COMMIT
      }
    },
    headline: {
      api_first_rate: 0,
      label: "API-first rate pending calculation",
      methodology_url: "/methodology/#headline-rate"
    },
    spend_bands: SPEND_BAND_OPTIONS.map((band) => band.slug),
    traffic_shapes: TRAFFIC_SHAPE_OPTIONS.map((shape) => shape.slug),
    hard_constraints: HARD_CONSTRAINT_OPTIONS.map((constraint) => constraint.slug),
    api_models: apiMappings.map((mapping) => ({
      slug: mapping.slug,
      name: mapping.name,
      vendor: mapping.vendor,
      family: mapping.family,
      size_class: mapping.size_class,
      typical_price_source: mapping.typical_price_source,
      mapped_open_weight_candidates: mapping.mapped_open_weight_candidates,
      quality_caveat: mapping.quality_caveat
    })),
    serving_modalities: servingModalities.map((modality) => modality.slug as ServingModalitySlug),
    serving_modality_details: servingModalities,
    exception_rules: DEFAULT_EXCEPTION_RULES,
    reference_profiles: REFERENCE_PROFILES
  };
  const apiFirstRate = computeHeadlineRate(boundaryWithoutRate);

  return {
    ...boundaryWithoutRate,
    headline: {
      ...boundaryWithoutRate.headline,
      api_first_rate: Number(apiFirstRate.toFixed(4)),
      label: headlineLabel(apiFirstRate)
    }
  };
}

export async function buildArtifacts() {
  const models = (await loadModels()).filter((model) => model.tier !== "archived");
  const gpuSpecs = new Map((await loadGpuSpecs()).map((gpu) => [gpu.sku, gpu]));

  await Promise.all(models.map(async (model) => {
    const modelDir = projectPath("src/data/generated/compositions", model.slug);
    await mkdir(modelDir, { recursive: true });

    await Promise.all(
      CLOUDS.map((cloud) => {
        const artifact = buildArtifact(model, cloud.slug, gpuSpecs);
        return writeFile(path.join(modelDir, `${cloud.slug}.json`), `${JSON.stringify(artifact, null, 2)}\n`);
      })
    );
  }));

  const boundary = await buildCheckBoundaryArtifact();
  await mkdir(projectPath("src/data/generated"), { recursive: true });
  await writeFile(projectPath("src/data/generated/check-boundaries.json"), `${JSON.stringify(boundary, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await buildArtifacts();
}
