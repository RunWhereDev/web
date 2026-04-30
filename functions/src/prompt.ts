export interface EscalationInputs {
  workload_context?: string;
  free_text?: string;
  quality_tolerance?: "strict" | "moderate" | "flexible";
  latency_tolerance?: "tight" | "moderate" | "relaxed";
  operational_risk_tolerance?: "low" | "medium" | "high";
  compliance_detail?: string;
  normalized_inputs?: unknown;
  outcome?: string;
  flow?: "check" | "advanced";
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
  headline?: unknown;
  api_models?: unknown;
  serving_modality_details?: unknown;
  exception_rules?: unknown;
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

  if (artifact.headline || artifact.api_models) {
    return {
      artifact: artifact.artifact,
      headline: artifact.headline,
      api_models: artifact.api_models,
      serving_modalities: artifact.serving_modality_details,
      exception_rules: artifact.exception_rules
    };
  }

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
Why API is probably still right: <specific reasons the hosted API remains the default>
What could make you the exception: <specific boundary traits, constraints, or cost/capacity facts from the supplied artifact>
Serving option to investigate first: <one modality and why; say when data is insufficient>
Bottom line: <one direct sentence>

Cite specific figures when present. Never claim quality equivalence between hosted and open-weight models unless the mapping explicitly says so. Be concise.`;

export function buildMessages(artifactJson: unknown, inputs: EscalationInputs, compositionKey?: string) {
  const context = compactArtifactContext(artifactJson, compositionKey);
  const user = `RunWhere tailored analysis request.\n\nUser context: ${JSON.stringify(inputs)}\n\nArtifact context: ${JSON.stringify(context)}`;
  return { system: SYSTEM_PROMPT, user };
}

export function buildPrompt(artifactJson: unknown, inputs: EscalationInputs, compositionKey?: string) {
  const { system, user } = buildMessages(artifactJson, inputs, compositionKey);
  return `${system}\n\n${user}`;
}
