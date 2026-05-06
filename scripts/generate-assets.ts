import fs from "node:fs/promises";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";

const root = process.cwd();
const publicDir = path.join(root, "public");

const ogWidth = 1200;
const ogHeight = 630;
const ogSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${ogWidth}" height="${ogHeight}" viewBox="0 0 ${ogWidth} ${ogHeight}">
  <rect width="${ogWidth}" height="${ogHeight}" fill="#f9f9fb" />
  <rect x="40" y="40" width="${ogWidth - 80}" height="${ogHeight - 80}" rx="24" fill="#f2f1f5" stroke="#cec9da" stroke-width="2" />
  <g font-family="-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif" fill="#1f2030">
    <text x="92" y="128" font-size="42" font-weight="600">RunWhere</text>
    <text x="92" y="258" font-size="64" font-weight="600">Self-Hosting LLMs vs.</text>
    <text x="92" y="338" font-size="64" font-weight="600">Managed API.</text>
    <text x="92" y="410" font-size="34" fill="#52566a">Compare the costs of self-hosting open-weight</text>
    <text x="92" y="458" font-size="34" fill="#52566a">models against managed LLM APIs.</text>
    <text x="${ogWidth - 92}" y="${ogHeight - 92}" text-anchor="end" font-size="24" fill="#676b80">RunWhere</text>
  </g>
</svg>`;

async function main() {
    await fs.mkdir(publicDir, { recursive: true });
    await fs.writeFile(path.join(publicDir, "og.svg"), ogSvg);
    const ogPng = new Resvg(ogSvg, {
        fitTo: { mode: "width", value: ogWidth }
    }).render().asPng();
    await fs.writeFile(path.join(publicDir, "og.png"), ogPng);

    console.log("Generated OG assets.");
}

main().catch(console.error);
