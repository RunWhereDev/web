import { mkdir, writeFile } from "node:fs/promises";
import { API_MODEL_DEFAULTS, CLOUD_GPU_CATALOG, DEFAULT_GENERATED_AT } from "./catalog";
import { projectPath } from "./content";

const generatedAt = process.env.RUNWHERE_GENERATED_AT || DEFAULT_GENERATED_AT;

await mkdir(projectPath("src/data/generated/snapshots"), { recursive: true });
await writeFile(
  projectPath("src/data/generated/snapshots/pricing.json"),
  `${JSON.stringify(
    {
      generated_at: generatedAt,
      note: "Deterministic seed snapshot. Replace with live catalog fetchers before production launch.",
      clouds: CLOUD_GPU_CATALOG,
      api_models: API_MODEL_DEFAULTS
    },
    null,
    2
  )}\n`
);
