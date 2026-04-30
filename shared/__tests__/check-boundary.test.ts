import { describe, expect, it } from "vitest";
import {
    DEFAULT_EXCEPTION_RULES,
    HARD_CONSTRAINT_OPTIONS,
    REFERENCE_PROFILES,
    SPEND_BAND_OPTIONS,
    TRAFFIC_SHAPE_OPTIONS,
    buildServingOptionRows,
    computeHeadlineRate,
    decodeCheckProfile,
    encodeCheckProfile,
    evaluateCheckProfile,
    headlineLabel
} from "../check-boundary";
import type { CheckBoundaryArtifact, CheckProfile } from "../types";

const boundary: CheckBoundaryArtifact = {
    artifact: {
        id: "test-boundary",
        generated_at: "2026-04-29T03:00:00.000Z",
        ruleset_version: "1.1.0",
        source_commits: { pricing: "test", throughput: "test", models: "test" }
    },
    headline: {
        api_first_rate: 0,
        label: "pending",
        methodology_url: "/methodology/#headline-rate"
    },
    spend_bands: SPEND_BAND_OPTIONS.map((band) => band.slug),
    traffic_shapes: TRAFFIC_SHAPE_OPTIONS.map((shape) => shape.slug),
    hard_constraints: HARD_CONSTRAINT_OPTIONS.map((constraint) => constraint.slug),
    api_models: [
        {
            slug: "gpt-5-mini",
            name: "GPT-5 mini",
            vendor: "OpenAI",
            family: "GPT-5",
            size_class: "small",
            mapped_open_weight_candidates: ["gemma-4-26b", "mistral-small-4"],
            quality_caveat: "Not quality equivalent."
        },
        {
            slug: "gemini-2-5-flash",
            name: "Gemini 2.5 Flash",
            vendor: "Google",
            family: "Gemini",
            size_class: "small",
            mapped_open_weight_candidates: ["gemma-4-26b", "phi-4"],
            quality_caveat: "Not quality equivalent."
        },
        {
            slug: "claude-haiku-4",
            name: "Claude Haiku 4",
            vendor: "Anthropic",
            family: "Claude",
            size_class: "medium",
            mapped_open_weight_candidates: ["mistral-small-4", "qwen-3-5"],
            quality_caveat: "Not quality equivalent."
        },
        {
            slug: "claude-sonnet-5",
            name: "Claude Sonnet 5",
            vendor: "Anthropic",
            family: "Claude",
            size_class: "frontier",
            mapped_open_weight_candidates: ["llama-4-maverick"],
            quality_caveat: "Not quality equivalent."
        },
        {
            slug: "gpt-5",
            name: "GPT-5",
            vendor: "OpenAI",
            family: "GPT-5",
            size_class: "frontier",
            mapped_open_weight_candidates: ["llama-4-maverick"],
            quality_caveat: "Not quality equivalent."
        },
        {
            slug: "other",
            name: "Other",
            vendor: "Unknown",
            family: "Unknown",
            size_class: "medium",
            mapped_open_weight_candidates: ["mistral-small-4"],
            quality_caveat: "Unknown mapping."
        }
    ],
    serving_modalities: ["api", "managed-endpoint", "serverless-gpu", "vm-cheap", "vm-serious", "batch-gpu", "owned-hardware"],
    serving_modality_details: [
        { slug: "api", label: "Hosted API", description: "API", pricing_model: "tokens", best_fit: "default", v1_treatment: "modeled", operational_effort: "Low", sort_order: 0 },
        { slug: "managed-endpoint", label: "Managed endpoint", description: "Managed", pricing_model: "hours", best_fit: "isolation", v1_treatment: "preview", operational_effort: "Medium", sort_order: 1 },
        { slug: "serverless-gpu", label: "Serverless GPU", description: "Serverless", pricing_model: "seconds", best_fit: "bursty", v1_treatment: "modeled", operational_effort: "Medium", sort_order: 2 },
        { slug: "vm-cheap", label: "Cheap VM", description: "VM", pricing_model: "hours", best_fit: "steady", v1_treatment: "modeled", operational_effort: "Medium", sort_order: 3 },
        { slug: "vm-serious", label: "Serious VM", description: "VM", pricing_model: "hours", best_fit: "frontier", v1_treatment: "modeled", operational_effort: "High", sort_order: 4 },
        { slug: "batch-gpu", label: "Batch GPU", description: "Batch", pricing_model: "hours", best_fit: "batch", v1_treatment: "preview", operational_effort: "Medium", sort_order: 5 },
        { slug: "owned-hardware", label: "Owned hardware", description: "Owned", pricing_model: "capex", best_fit: "compliance", v1_treatment: "advisory", operational_effort: "High", sort_order: 6 }
    ],
    exception_rules: DEFAULT_EXCEPTION_RULES,
    reference_profiles: REFERENCE_PROFILES
};

describe("check boundary", () => {
    it("round-trips compact profile encoding", () => {
        const profile: CheckProfile = {
            ruleset_version: "1.1.0",
            spend_band: "200_to_2k",
            hosted_model: "gpt-5-mini",
            traffic_shape: "steady",
            hard_constraints: ["data_residency"]
        };

        expect(decodeCheckProfile(encodeCheckProfile(profile))).toEqual(profile);
    });

    it("confirms API for low-spend bursty workloads", () => {
        expect(
            evaluateCheckProfile(boundary, {
                ruleset_version: "1.1.0",
                spend_band: "lt_200",
                hosted_model: "gpt-5-mini",
                traffic_shape: "bursty",
                hard_constraints: []
            }).outcome
        ).toBe("confirmed_api");
    });

    it("detects likely exceptions and orders serving options", () => {
        const profile: CheckProfile = {
            ruleset_version: "1.1.0",
            spend_band: "200_to_2k",
            hosted_model: "gpt-5-mini",
            traffic_shape: "steady",
            hard_constraints: []
        };
        const evaluation = evaluateCheckProfile(boundary, profile);
        const rows = buildServingOptionRows(boundary, profile, evaluation);

        expect(evaluation.outcome).toBe("may_be_exception");
        expect(rows[0].slug).toBe("vm-cheap");
        expect(rows.some((row) => row.slug === "vm-cheap" && row.fit_status === "recommended")).toBe(true);
    });

    it("treats hard constraints as non-cost questions", () => {
        expect(
            evaluateCheckProfile(boundary, {
                ruleset_version: "1.1.0",
                spend_band: "lt_200",
                hosted_model: "gpt-5-mini",
                traffic_shape: "bursty",
                hard_constraints: ["air_gap"]
            }).outcome
        ).toBe("hard_constraint");
    });

    it("computes the headline rate from reference profiles", () => {
        const rate = computeHeadlineRate(boundary);
        expect(rate).toBeGreaterThan(0.7);
        expect(headlineLabel(rate)).toContain("typical workloads should stay on the API");
    });
});