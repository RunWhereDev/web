export interface EscalationInputs {
  workload_context?: string;
  latency_tolerance?: "tight" | "moderate" | "relaxed";
  operational_risk_tolerance?: "low" | "medium" | "high";
}

interface ArtifactLike {
  artifact?: unknown;
  model_facts?: unknown;
  api_side?: unknown;
  defaults?: {
    gpu_sku?: string;
    quantization?: string;
    shape?: string;
  };
  options?: {
    assumptions?: unknown;
    regime_threshold?: number;
  };
  compositions?: Record<string, unknown>;
}

function defaultCompositionKey(artifact: ArtifactLike) {
  if (artifact.defaults?.gpu_sku && artifact.defaults.quantization && artifact.defaults.shape) {
    return `${artifact.defaults.gpu_sku}__${artifact.defaults.quantization}__${artifact.defaults.shape}`;
  }

  const compositions = artifact.compositions || {};
  return Object.keys(compositions)[0];
}

export function compactArtifactContext(artifactJson: unknown, compositionKey?: string) {
  const artifact = artifactJson as ArtifactLike;
  const compositions = artifact.compositions || {};
  const selectedKey = compositionKey && compositions[compositionKey] ? compositionKey : defaultCompositionKey(artifact);

  return {
    artifact: artifact.artifact,
    model_facts: artifact.model_facts,
    api_side: artifact.api_side,
    defaults: artifact.defaults,
    assumptions: artifact.options?.assumptions,
    regime_threshold: artifact.options?.regime_threshold,
    selected_composition_key: selectedKey,
    selected_composition: selectedKey ? compositions[selectedKey] : undefined
  };
}

const SYSTEM_PROMPT = `You are RunWhere's analysis assistant. Reason only from the supplied artifact data. Do not invent pricing, throughput, or specifications not present in the data.

Return exactly four sections in this order, each on its own line:
Tilts toward self-host: <specific reasons the numbers favour self-hosting>
Tilts toward API: <specific reasons the numbers favour the hosted API>
Preferences that dominate: <which operational factors would tip this close call — latency, team size, risk appetite, lock-in concerns>
Bottom line: <one direct sentence>

Cite specific figures. Be concise.`;

export function buildMessages(artifactJson: unknown, inputs: EscalationInputs, compositionKey?: string) {
  const context = compactArtifactContext(artifactJson, compositionKey);
  const user = `Close-call analysis request.\n\nUser context: ${JSON.stringify(inputs)}\n\nArtifact context: ${JSON.stringify(context)}`;
  return { system: SYSTEM_PROMPT, user };
}

export function buildPrompt(artifactJson: unknown, inputs: EscalationInputs, compositionKey?: string) {
  const { system, user } = buildMessages(artifactJson, inputs, compositionKey);
  return `${system}\n\n${user}`;
}
