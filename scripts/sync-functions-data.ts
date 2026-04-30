import { cp, mkdir } from "node:fs/promises";
import { projectPath } from "./content";

await mkdir(projectPath("functions/data"), { recursive: true });
await cp(projectPath("src/data/generated"), projectPath("functions/data"), {
  recursive: true,
  force: true
});
