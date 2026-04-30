import { createReadStream, existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { requireProjectId } from "./config.js";
import { buildMessages, type EscalationInputs } from "./prompt.js";
import { getRequiredSecret } from "./secrets.js";

interface EscalationRequest {
  artifact_id?: string;
  flow?: "check" | "advanced";
  outcome?: string;
  normalized_inputs?: unknown;
  free_text?: string;
  model_slug?: string;
  cloud?: string;
  composition_key?: string;
  inputs?: EscalationInputs;
  turnstile_token?: string;
}

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const rateLimitPerHour = Number(process.env.RUNWHERE_RATE_LIMIT_PER_HOUR || 10);
const callsByIp = new Map<string, number[]>();

function pruneRateLimit(now = Date.now()) {
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  for (const [ip, calls] of callsByIp) {
    const freshCalls = calls.filter((timestamp) => timestamp > windowStart);
    if (freshCalls.length > 0) {
      callsByIp.set(ip, freshCalls);
    } else {
      callsByIp.delete(ip);
    }
  }
}

const sweepTimer = setInterval(pruneRateLimit, RATE_LIMIT_WINDOW_MS);
sweepTimer.unref();

function allowed(ip: string) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
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
  if (body.flow === "check" || body.artifact_id?.includes("boundaries")) {
    const filePath = path.join(process.cwd(), "data/check-boundaries.json");
    return JSON.parse(await readFile(filePath, "utf8"));
  }

  if (!body.model_slug || !body.cloud) {
    throw new Error("model_slug and cloud are required for advanced escalation");
  }

  const filePath = path.join(process.cwd(), "data/compositions", body.model_slug, `${body.cloud}.json`);
  return JSON.parse(await readFile(filePath, "utf8"));
}

const GEMINI_MODEL = process.env.RUNWHERE_VERTEX_MODEL || "gemini-2.5-flash";
const VERTEX_LOCATION = process.env.RUNWHERE_GCP_LOCATION || "global";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type"
};

function writeSse(response: import("node:http").ServerResponse, event: string, data: unknown) {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function validateTurnstile(body: EscalationRequest, ip: string) {
  if (process.env.RUNWHERE_DISABLE_TURNSTILE === "true") return;

  if (!body.turnstile_token) {
    throw new Error("turnstile_token is required");
  }

  const secret = process.env.TURNSTILE_SECRET_KEY || await getRequiredSecret("TURNSTILE_SECRET_KEY");
  const form = new URLSearchParams({
    secret,
    response: body.turnstile_token,
    remoteip: ip
  });
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form
  });
  const result = await response.json() as { success?: boolean; "error-codes"?: string[] };

  if (!result.success) {
    throw new Error(`turnstile_failed:${result["error-codes"]?.join(",") || "unknown"}`);
  }
}

export const server = createServer(async (request, response) => {
  const ip = request.socket.remoteAddress || "unknown";

  if (request.method === "OPTIONS") {
    response.writeHead(204, CORS_HEADERS);
    response.end();
    return;
  }

  if (request.method === "GET" && request.url === "/healthz") {
    response.writeHead(200, { ...CORS_HEADERS, "content-type": "text/plain" });
    response.end("ok");
    return;
  }

  if (request.method === "GET" && request.url === "/") {
    const indexPath = path.join(process.cwd(), "data/manifest.json");
    if (existsSync(indexPath)) {
      response.writeHead(200, { ...CORS_HEADERS, "content-type": "application/json" });
      createReadStream(indexPath).pipe(response);
      return;
    }
  }

  if (request.method !== "POST" || request.url !== "/escalate") {
    response.writeHead(404, { ...CORS_HEADERS, "content-type": "application/json" });
    response.end(JSON.stringify({ error: "not_found" }));
    return;
  }

  if (!allowed(ip)) {
    response.writeHead(429, { ...CORS_HEADERS, "content-type": "application/json" });
    response.end(JSON.stringify({ error: "rate_limited" }));
    return;
  }

  try {
    const body = JSON.parse(await readBody(request)) as EscalationRequest;
    await validateTurnstile(body, ip);
    const artifact = await loadArtifact(body);
    const { system, user } = buildMessages(artifact, {
      ...(body.inputs || {}),
      flow: body.flow,
      outcome: body.outcome,
      normalized_inputs: body.normalized_inputs,
      free_text: body.free_text
    }, body.composition_key);
    const started = Date.now();

    response.writeHead(200, {
      ...CORS_HEADERS,
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive"
    });

    const genai = new GoogleGenAI({
      vertexai: true,
      project: requireProjectId(),
      location: VERTEX_LOCATION
    });
    const stream = await genai.models.generateContentStream({
      model: GEMINI_MODEL,
      contents: user,
      config: {
        systemInstruction: system,
        temperature: 0.3,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) writeSse(response, "chunk", { text });
    }

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      artifact_id: body.artifact_id || artifact.artifact?.id,
      flow: body.flow || "advanced",
      outcome: body.outcome || "unknown",
      response_time_ms: Date.now() - started,
      input_tokens: null,
      output_tokens: null,
      cost_usd: null
    }));
    writeSse(response, "done", { ok: true });
    response.end();
  } catch (error) {
    if (!response.headersSent) {
      response.writeHead(400, { ...CORS_HEADERS, "content-type": "application/json" });
      response.end(JSON.stringify({ error: error instanceof Error ? error.message : "bad_request" }));
    } else {
      writeSse(response, "error", { message: error instanceof Error ? error.message : "stream_error" });
      response.end();
    }
  }
});

if (process.argv[1]?.endsWith("escalate.js")) {
  const port = Number(process.env.PORT || 8080);
  server.listen(port, () => {
    console.log(`RunWhere escalation stub listening on ${port}`);
  });
}
