import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { CLOUDS, DEFAULT_GENERATED_AT, RULESET_VERSION, SHAPES } from "./catalog";
import { loadModels, projectPath } from "./content";
import type { CheckBoundaryArtifact } from "../shared/types";

const generatedAt = process.env.RUNWHERE_GENERATED_AT || DEFAULT_GENERATED_AT;

export async function buildManifest() {
  const models = (await loadModels()).filter((model) => model.tier !== "archived");
  const boundary = JSON.parse(
    await readFile(projectPath("src/data/generated/check-boundaries.json"), "utf8")
  ) as CheckBoundaryArtifact;
  const manifest = {
    generated_at: generatedAt,
    ruleset_version: RULESET_VERSION,
    headline: boundary.headline,
    refresh: {
      pricing_last_run: generatedAt,
      throughput_last_run: generatedAt
    },
    api_models: boundary.api_models,
    models: models.map((model) => ({
      slug: model.slug,
      name: model.name,
      family: model.family,
      vendor: model.vendor,
      params_b: model.params_b,
      active_params_b: model.active_params_b,
      license: model.license,
      tier: model.tier,
      one_liner: model.one_liner,
      clouds: CLOUDS.map((cloud) => cloud.slug)
    })),
    clouds: CLOUDS,
    serving_modalities: boundary.serving_modality_details.map((modality) => ({
      slug: modality.slug,
      label: modality.label
    })),
    shapes: SHAPES
  };

  await mkdir(projectPath("src/data/generated"), { recursive: true });
  await writeFile(projectPath("src/data/generated/manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await buildManifest();
}
