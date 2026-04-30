import { createReadStream, existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { buildPrompt, type EscalationInputs } from "./prompt.js";

interface EscalationRequest {
  artifact_id?: string;
  model_slug?: string;
  cloud?: string;
  inputs?: EscalationInputs;
  turnstile_token?: string;
}

const rateLimitPerHour = Number(process.env.RUNWHERE_RATE_LIMIT_PER_HOUR || 10);
const callsByIp = new Map<string, number[]>();

function allowed(ip: string) {
  const now = Date.now();
  const windowStart = now - 60 * 60 * 1000;
  const calls = (callsByIp.get(ip) || []).filter((timestamp) => timestamp > windowStart);
  if (calls.length >= rateLimitPerHour) return false;
  calls.push(now);
  callsByIp.set(ip, calls);
  return true;
}

async function readBody(request: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function loadArtifact(body: EscalationRequest) {
  if (!body.model_slug || !body.cloud) {
    throw new Error("model_slug and cloud are required");
  }

  const filePath = path.join(process.cwd(), "data/compositions", body.model_slug, `${body.cloud}.json`);
  return JSON.parse(await readFile(filePath, "utf8"));
}

function writeSse(response: import("node:http").ServerResponse, event: string, data: unknown) {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
}

export const server = createServer(async (request, response) => {
  const ip = request.socket.remoteAddress || "unknown";

  if (request.method === "GET" && request.url === "/healthz") {
    response.writeHead(200, { "content-type": "text/plain" });
    response.end("ok");
    return;
  }

  if (request.method === "GET" && request.url === "/") {
    const indexPath = path.join(process.cwd(), "data/manifest.json");
    if (existsSync(indexPath)) {
      response.writeHead(200, { "content-type": "application/json" });
      createReadStream(indexPath).pipe(response);
      return;
    }
  }

  if (request.method !== "POST" || request.url !== "/escalate") {
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "not_found" }));
    return;
  }

  if (!allowed(ip)) {
    response.writeHead(429, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "rate_limited" }));
    return;
  }

  try {
    const body = JSON.parse(await readBody(request)) as EscalationRequest;
    const artifact = await loadArtifact(body);
    const prompt = buildPrompt(artifact, body.inputs || {});

    response.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive"
    });

    writeSse(response, "chunk", {
      text: "Live Vertex AI streaming is not configured in this local stub. The prompt is ready for deployment wiring."
    });
    writeSse(response, "debug", {
      artifact_id: artifact.artifact?.id || body.artifact_id,
      prompt_chars: prompt.length
    });
    writeSse(response, "done", { ok: true });
    response.end();
  } catch (error) {
    response.writeHead(400, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : "bad_request" }));
  }
});

if (process.argv[1]?.endsWith("escalate.js")) {
  const port = Number(process.env.PORT || 8080);
  server.listen(port, () => {
    console.log(`RunWhere escalation stub listening on ${port}`);
  });
}
