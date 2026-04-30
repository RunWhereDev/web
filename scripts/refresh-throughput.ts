import { mkdir, writeFile } from "node:fs/promises";
import { API_MODEL_DEFAULTS, DEFAULT_GENERATED_AT } from "./catalog";
import { projectPath } from "./content";

const generatedAt = process.env.RUNWHERE_GENERATED_AT || DEFAULT_GENERATED_AT;

await mkdir(projectPath("src/data/generated/snapshots"), { recursive: true });
await writeFile(
  projectPath("src/data/generated/snapshots/throughput.json"),
  `${JSON.stringify(
    {
      generated_at: generatedAt,
      note: "Deterministic seed snapshot. Replace with live HF/OpenRouter throughput fetchers before production launch.",
      models: Object.fromEntries(
        Object.entries(API_MODEL_DEFAULTS).map(([slug, api]) => [
          slug,
          {
            throughput_p50_tps: api.throughput_p50_tps,
            throughput_p90_tps: api.throughput_p90_tps,
            providers_count: api.providers_count
          }
        ])
      )
    },
    null,
    2
  )}\n`
);
