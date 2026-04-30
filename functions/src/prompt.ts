export interface EscalationInputs {
  workload_context?: string;
  latency_tolerance?: "tight" | "moderate" | "relaxed";
  operational_risk_tolerance?: "low" | "medium" | "high";
}

export function buildPrompt(artifactJson: unknown, inputs: EscalationInputs) {
  return [
    "You are RunWhere's analysis assistant.",
    "Reason only from the supplied artifact. Do not invent current pricing.",
    "Return four sections: What tips this one way, What tips it the other, Which preferences likely matter most, Bottom line.",
    "",
    `User inputs: ${JSON.stringify(inputs)}`,
    `Artifact: ${JSON.stringify(artifactJson)}`
  ].join("\n");
}
