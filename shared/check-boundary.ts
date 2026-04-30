import type {
    CheckBoundaryArtifact,
    CheckEvaluation,
    CheckProfile,
    ExceptionRule,
    HardConstraint,
    PrimaryOutcome,
    ReferenceProfile,
    ServingModalitySlug,
    ServingOptionRow,
    SpendBand,
    TrafficShape
} from "./types";

export const SPEND_BAND_OPTIONS: Array<{ slug: SpendBand; label: string; shortLabel: string; midpointUsd: number }> = [
    { slug: "lt_200", label: "Less than $200/month", shortLabel: "< $200", midpointUsd: 100 },
    { slug: "200_to_2k", label: "$200–$2K/month", shortLabel: "$200–$2K", midpointUsd: 1_100 },
    { slug: "2k_to_10k", label: "$2K–$10K/month", shortLabel: "$2K–$10K", midpointUsd: 6_000 },
    { slug: "gt_10k", label: "$10K+/month", shortLabel: "$10K+", midpointUsd: 15_000 }
];

export const TRAFFIC_SHAPE_OPTIONS: Array<{ slug: TrafficShape; label: string; description: string }> = [
    { slug: "bursty", label: "Bursty", description: "Peaks are at least ~5× average; scale-to-zero can matter." },
    { slug: "steady", label: "Steady", description: "Traffic stays within roughly ~2× average." },
    { slug: "batch", label: "Predictable batches", description: "Offline jobs, backfills, or scheduled inference." }
];

export const HARD_CONSTRAINT_OPTIONS: Array<{ slug: HardConstraint; label: string }> = [
    { slug: "data_residency", label: "Data residency" },
    { slug: "air_gap", label: "Air-gap" },
    { slug: "latency_sub_100ms_p99", label: "Latency <100ms p99" }
];

export const DEFAULT_EXCEPTION_RULES: ExceptionRule[] = [
    {
        id: "hard-data-residency",
        when: { hard_constraint: "data_residency" },
        outcome: "hard_constraint",
        preferred_modalities: ["managed-endpoint", "owned-hardware", "serverless-gpu"],
        rationale: "Data residency can make provider controls, private networking, or owned/on-prem deployment more important than token price."
    },
    {
        id: "hard-air-gap",
        when: { hard_constraint: "air_gap" },
        outcome: "hard_constraint",
        preferred_modalities: ["owned-hardware", "vm-serious", "vm-cheap"],
        rationale: "Air-gapped workloads are not a pure API-vs-GPU cost comparison."
    },
    {
        id: "hard-latency-sub-100ms",
        when: { hard_constraint: "latency_sub_100ms_p99" },
        outcome: "hard_constraint",
        preferred_modalities: ["serverless-gpu", "managed-endpoint", "vm-cheap"],
        rationale: "Sub-100ms p99 latency can force regional dedicated serving even when hosted API token cost is lower."
    },
    {
        id: "steady-small-model-mid-spend",
        when: { spend_band: "200_to_2k", traffic_shape: "steady", candidate_size: "small" },
        outcome: "may_be_exception",
        preferred_modalities: ["vm-cheap", "serverless-gpu", "managed-endpoint"],
        rationale: "A steady small-model substitute can fit on cheap single-GPU capacity before API spend is very high."
    },
    {
        id: "steady-small-model-high-spend",
        when: { spend_band: "2k_to_10k", traffic_shape: "steady", candidate_size: "small" },
        outcome: "may_be_exception",
        preferred_modalities: ["vm-cheap", "managed-endpoint", "serverless-gpu"],
        rationale: "At sustained four-figure API spend, a right-sized always-on GPU VM is worth checking."
    },
    {
        id: "steady-medium-model-high-spend",
        when: { spend_band: "2k_to_10k", traffic_shape: "steady", candidate_size: "medium" },
        outcome: "may_be_exception",
        preferred_modalities: ["vm-cheap", "vm-serious", "managed-endpoint"],
        rationale: "Medium open-weight substitutes can be viable when utilization is predictable."
    },
    {
        id: "batch-small-or-medium",
        when: { traffic_shape: "batch", candidate_size: "small" },
        outcome: "may_be_exception",
        preferred_modalities: ["batch-gpu", "serverless-gpu", "vm-cheap"],
        rationale: "Batch jobs can avoid always-on idle capacity and API burst pricing."
    },
    {
        id: "batch-medium-high-spend",
        when: { spend_band: "2k_to_10k", traffic_shape: "batch", candidate_size: "medium" },
        outcome: "may_be_exception",
        preferred_modalities: ["batch-gpu", "vm-serious", "managed-endpoint"],
        rationale: "Predictable medium-model batches are one of the cleaner self-host exceptions."
    },
    {
        id: "frontier-very-high-steady-spend",
        when: { spend_band: "gt_10k", traffic_shape: "steady", candidate_size: "frontier" },
        outcome: "may_be_exception",
        preferred_modalities: ["managed-endpoint", "vm-serious", "owned-hardware"],
        rationale: "Frontier-scale self-hosting needs serious capacity, but very high steady spend can justify a deeper read."
    },
    {
        id: "very-high-spend-any-fit",
        when: { spend_band: "gt_10k" },
        outcome: "may_be_exception",
        preferred_modalities: ["managed-endpoint", "vm-serious", "owned-hardware"],
        rationale: "Five-figure monthly API spend is high enough to test dedicated capacity, even if API may still win."
    }
];

export const REFERENCE_PROFILES: ReferenceProfile[] = [
    { id: "low-bursty-small", label: "Low spend, bursty small-model app", weight: 27, profile: { spend_band: "lt_200", hosted_model: "gpt-5-mini", traffic_shape: "bursty", hard_constraints: [] } },
    { id: "low-steady-small", label: "Low spend, steady small-model app", weight: 17, profile: { spend_band: "lt_200", hosted_model: "gemini-2-5-flash", traffic_shape: "steady", hard_constraints: [] } },
    { id: "mid-bursty-small", label: "Mid spend, bursty small-model product", weight: 18, profile: { spend_band: "200_to_2k", hosted_model: "gpt-5-mini", traffic_shape: "bursty", hard_constraints: [] } },
    { id: "mid-steady-small", label: "Mid spend, steady small-model product", weight: 3, profile: { spend_band: "200_to_2k", hosted_model: "gpt-5-mini", traffic_shape: "steady", hard_constraints: [] } },
    { id: "mid-bursty-frontier", label: "Mid spend, bursty frontier-family product", weight: 15, profile: { spend_band: "200_to_2k", hosted_model: "gpt-5", traffic_shape: "bursty", hard_constraints: [] } },
    { id: "high-bursty-frontier", label: "High spend, bursty frontier-family product", weight: 12, profile: { spend_band: "2k_to_10k", hosted_model: "claude-sonnet-5", traffic_shape: "bursty", hard_constraints: [] } },
    { id: "high-steady-medium", label: "High spend, steady medium-model product", weight: 2, profile: { spend_band: "2k_to_10k", hosted_model: "claude-haiku-4", traffic_shape: "steady", hard_constraints: [] } },
    { id: "batch-small", label: "Predictable small-model batch job", weight: 2, profile: { spend_band: "200_to_2k", hosted_model: "gemini-2-5-flash", traffic_shape: "batch", hard_constraints: [] } },
    { id: "very-high-frontier", label: "Very high steady frontier spend", weight: 2, profile: { spend_band: "gt_10k", hosted_model: "gpt-5", traffic_shape: "steady", hard_constraints: [] } },
    { id: "compliance-bound", label: "Compliance-bound workload", weight: 2, profile: { spend_band: "200_to_2k", hosted_model: "gpt-5-mini", traffic_shape: "bursty", hard_constraints: ["data_residency"] } }
];

const OUTCOME_LABELS: Record<PrimaryOutcome, string> = {
    confirmed_api: "Confirmed: API is the right call for you",
    may_be_exception: "You may be the exception",
    hard_constraint: "This is not just a cost question",
    insufficient_data: "We need a tailored read"
};

const OUTCOME_SUMMARIES: Record<PrimaryOutcome, string> = {
    confirmed_api: "Given your spend band, traffic shape, and hosted model family, self-hosting is unlikely to beat the API after GPU rental and operational time.",
    may_be_exception: "Your workload has at least one trait where self-hosting can make sense. Start with the lowest-operational-burden option that fits.",
    hard_constraint: "A hard residency, air-gap, or latency requirement can dominate the cost comparison. Treat the API price as only one row in the decision.",
    insufficient_data: "The selected hosted model is outside the baked boundary or source data is missing. Use the advanced path or the opt-in tailored analysis."
};

function getBase64Helpers() {
    const maybeBuffer = globalThis as typeof globalThis & {
        Buffer?: { from(input: string, encoding?: BufferEncoding): { toString(encoding?: BufferEncoding | "base64url"): string } };
    };

    return {
        encode(input: string) {
            if (typeof btoa === "function" && typeof TextEncoder !== "undefined") {
                const utf8 = new TextEncoder().encode(input);
                const binString = Array.from(utf8, (byte) => String.fromCodePoint(byte)).join("");
                return btoa(binString).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
            }
            return maybeBuffer.Buffer?.from(input, "utf8").toString("base64url") || input;
        },
        decode(input: string) {
            if (typeof atob === "function" && typeof TextDecoder !== "undefined") {
                const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
                const binString = atob(padded);
                const bytes = new Uint8Array(binString.length);
                for (let i = 0; i < binString.length; i++) {
                    bytes[i] = binString.charCodeAt(i);
                }
                return new TextDecoder().decode(bytes);
            }
            return maybeBuffer.Buffer?.from(input, "base64url").toString("utf8") || input;
        }
    };
}

function unique<T>(items: T[]) {
    return Array.from(new Set(items));
}

export function spendBandLabel(spendBand: SpendBand) {
    return SPEND_BAND_OPTIONS.find((option) => option.slug === spendBand)?.shortLabel || spendBand;
}

export function trafficShapeLabel(trafficShape: TrafficShape) {
    return TRAFFIC_SHAPE_OPTIONS.find((option) => option.slug === trafficShape)?.label || trafficShape;
}

export function hardConstraintLabel(hardConstraint: HardConstraint) {
    return HARD_CONSTRAINT_OPTIONS.find((option) => option.slug === hardConstraint)?.label || hardConstraint;
}

export function normalizeConstraints(constraints: Array<HardConstraint | "none" | string> = []): HardConstraint[] {
    return unique(
        constraints.filter((constraint): constraint is HardConstraint =>
            HARD_CONSTRAINT_OPTIONS.some((option) => option.slug === constraint)
        )
    ).sort();
}

export function encodeCheckProfile(profile: CheckProfile) {
    const payload = {
        v: profile.ruleset_version,
        s: profile.spend_band,
        m: profile.hosted_model,
        t: profile.traffic_shape,
        c: normalizeConstraints(profile.hard_constraints),
        o: profile.candidate_open_weight_model || undefined
    };

    return getBase64Helpers().encode(JSON.stringify(payload));
}

export function decodeCheckProfile(encoded: string | null): CheckProfile | null {
    if (!encoded) return null;

    try {
        const parsed = JSON.parse(getBase64Helpers().decode(encoded)) as Partial<{
            v: string;
            s: SpendBand;
            m: string;
            t: TrafficShape;
            c: HardConstraint[];
            o: string;
            ruleset_version: string;
            spend_band: SpendBand;
            hosted_model: string;
            traffic_shape: TrafficShape;
            hard_constraints: HardConstraint[];
            candidate_open_weight_model: string;
        }>;

        const profile: CheckProfile = {
            ruleset_version: String(parsed.v || parsed.ruleset_version || ""),
            spend_band: (parsed.s || parsed.spend_band) as SpendBand,
            hosted_model: String(parsed.m || parsed.hosted_model || ""),
            traffic_shape: (parsed.t || parsed.traffic_shape) as TrafficShape,
            hard_constraints: normalizeConstraints(parsed.c || parsed.hard_constraints || []),
            candidate_open_weight_model: parsed.o || parsed.candidate_open_weight_model
        };

        const spendOk = SPEND_BAND_OPTIONS.some((option) => option.slug === profile.spend_band);
        const trafficOk = TRAFFIC_SHAPE_OPTIONS.some((option) => option.slug === profile.traffic_shape);

        return profile.ruleset_version && profile.hosted_model && spendOk && trafficOk ? profile : null;
    } catch {
        return null;
    }
}

function ruleMatches(rule: ExceptionRule, profile: CheckProfile, candidateSize?: string) {
    const when = rule.when;

    if (when.spend_band && when.spend_band !== profile.spend_band) return false;
    if (when.traffic_shape && when.traffic_shape !== profile.traffic_shape) return false;
    if (when.hosted_model && when.hosted_model !== profile.hosted_model) return false;
    if (when.candidate_size && when.candidate_size !== candidateSize) return false;
    if (when.hard_constraint && !profile.hard_constraints.includes(when.hard_constraint)) return false;

    return true;
}

export function evaluateCheckProfile(boundary: CheckBoundaryArtifact, profile: CheckProfile): CheckEvaluation {
    const mappedApiModel = boundary.api_models.find((model) => model.slug === profile.hosted_model);
    const rulesetMismatch = profile.ruleset_version !== boundary.artifact.ruleset_version;

    if (profile.hard_constraints.length > 0) {
        const hardRules = boundary.exception_rules.filter((rule) => rule.when.hard_constraint && ruleMatches(rule, profile, mappedApiModel?.size_class));

        return {
            outcome: "hard_constraint",
            label: OUTCOME_LABELS.hard_constraint,
            summary: OUTCOME_SUMMARIES.hard_constraint,
            mapped_api_model: mappedApiModel,
            matched_rules: hardRules,
            preferred_modalities: ["managed-endpoint", "owned-hardware", "serverless-gpu"],
            what_would_change: [
                "If a hosted provider can satisfy the exact residency, isolation, or p99-latency requirement, the API may still be simplest.",
                "If the constraint is non-negotiable, compare dedicated managed endpoints and owned/on-prem options before optimizing token cost.",
                "If a mapped open-weight substitute is not acceptable on quality, self-hosting economics are irrelevant."
            ],
            ruleset_mismatch: rulesetMismatch
        };
    }

    if (!mappedApiModel || profile.hosted_model === "other") {
        return {
            outcome: "insufficient_data",
            label: OUTCOME_LABELS.insufficient_data,
            summary: OUTCOME_SUMMARIES.insufficient_data,
            matched_rules: [],
            preferred_modalities: ["api", "managed-endpoint"],
            what_would_change: [
                "Pick the closest hosted model family if one exists, or open the advanced composer for a known open-weight candidate.",
                "Use tailored analysis when quality equivalence, provider availability, or pricing source data is unclear."
            ],
            ruleset_mismatch: rulesetMismatch
        };
    }

    const matchedRules = boundary.exception_rules.filter((rule) => ruleMatches(rule, profile, mappedApiModel.size_class));

    if (matchedRules.length > 0) {
        return {
            outcome: "may_be_exception",
            label: OUTCOME_LABELS.may_be_exception,
            summary: OUTCOME_SUMMARIES.may_be_exception,
            mapped_api_model: mappedApiModel,
            matched_rules: matchedRules,
            preferred_modalities: unique(matchedRules.flatMap((rule) => rule.preferred_modalities)),
            what_would_change: [
                "The result flips back toward API if mapped open-weight quality is not acceptable for your workload.",
                "The result flips toward self-hosting if traffic is steadier, batchable, or already high enough to keep GPUs busy.",
                "Operational risk tolerance matters: dedicated capacity is less attractive if no one owns reliability and model-serving operations."
            ],
            ruleset_mismatch: rulesetMismatch
        };
    }

    return {
        outcome: "confirmed_api",
        label: OUTCOME_LABELS.confirmed_api,
        summary: OUTCOME_SUMMARIES.confirmed_api,
        mapped_api_model: mappedApiModel,
        matched_rules: [],
        preferred_modalities: ["api"],
        what_would_change: [
            "Monthly API spend rises into the $10K+ band while traffic stays steady.",
            "The workload becomes predictable batch inference where active GPU-hours can replace always-on capacity.",
            "A small open-weight substitute is acceptable and fits on a cheap single-GPU deployment.",
            "A hard data-residency, air-gap, or sub-100ms p99 latency constraint appears."
        ],
        ruleset_mismatch: rulesetMismatch
    };
}

export function computeHeadlineRate(boundary: CheckBoundaryArtifact) {
    const totalWeight = boundary.reference_profiles.reduce((sum, referenceProfile) => sum + referenceProfile.weight, 0);
    const confirmedWeight = boundary.reference_profiles.reduce((sum, referenceProfile) => {
        const profile = { ...referenceProfile.profile, ruleset_version: boundary.artifact.ruleset_version };
        const evaluation = evaluateCheckProfile(boundary, profile);
        return sum + (evaluation.outcome === "confirmed_api" ? referenceProfile.weight : 0);
    }, 0);

    return totalWeight > 0 ? confirmedWeight / totalWeight : 0;
}

export function headlineLabel(apiFirstRate: number) {
    if (apiFirstRate >= 0.95) return `${Math.round(apiFirstRate * 100)}% of typical workloads should stay on the API`;
    const outOfTen = Math.max(1, Math.min(9, Math.round(apiFirstRate * 10)));
    return `${outOfTen} out of 10 typical workloads should stay on the API`;
}

function modalityLabel(slug: ServingModalitySlug) {
    const fallback: Record<ServingModalitySlug, string> = {
        api: "Hosted API",
        "managed-endpoint": "Managed dedicated endpoint",
        "serverless-gpu": "Serverless GPU",
        "vm-cheap": "Cheap always-on GPU VM",
        "vm-serious": "Serious always-on GPU VM",
        "batch-gpu": "Scheduled/batch GPU",
        "owned-hardware": "Owned/on-prem hardware"
    };

    return fallback[slug];
}

function recommendedStatus(slug: ServingModalitySlug, preferred: ServingModalitySlug[], outcome: PrimaryOutcome) {
    if (slug === "api" && outcome === "confirmed_api") return "recommended";
    if (preferred.includes(slug)) return "recommended";
    if (slug === "api") return outcome === "hard_constraint" ? "possible" : "baseline";
    if (slug === "owned-hardware" || slug === "managed-endpoint") return "advisory";
    return "not_a_fit";
}

export function buildServingOptionRows(
    boundary: CheckBoundaryArtifact,
    profile: CheckProfile,
    evaluation: CheckEvaluation
): ServingOptionRow[] {
    const detailsBySlug = new Map(boundary.serving_modality_details.map((detail) => [detail.slug, detail]));
    const spend = spendBandLabel(profile.spend_band);
    const candidates = evaluation.mapped_api_model?.mapped_open_weight_candidates.join(", ") || "closest viable substitute";
    const preferred = evaluation.preferred_modalities;
    const outcome = evaluation.outcome;

    const whyBySlug: Record<ServingModalitySlug, string> = {
        api:
            outcome === "confirmed_api"
                ? "This is the default recommendation: low-friction, elastic, and unlikely to be beaten after ops labor."
                : outcome === "hard_constraint"
                    ? "Use only if the provider can satisfy the selected hard constraint; otherwise cost is secondary."
                    : "Still the baseline to beat. API may remain best if quality or operations dominate the cost comparison.",
        "managed-endpoint": "Investigate when you need isolation, private networking, or deployment controls without owning raw VM operations.",
        "serverless-gpu":
            profile.traffic_shape === "bursty"
                ? "Best self-host first look for bursty small/medium workloads because scale-to-zero can avoid idle GPU rent."
                : "Possible for irregular traffic, but steady utilization usually makes always-on capacity easier to reason about.",
        "vm-cheap":
            profile.traffic_shape === "steady"
                ? "Worth testing when a mapped small/medium model fits on L4/A10G/T4/L40S-class GPUs and traffic is steady."
                : "Usually not the first stop unless traffic is steady enough to justify paying for idle capacity.",
        "vm-serious": "Relevant for frontier-scale substitutes or high-throughput workloads that need A100/H100-class nodes.",
        "batch-gpu":
            profile.traffic_shape === "batch"
                ? "Start here for predictable offline jobs because active job-hours can replace always-on capacity."
                : "Not recommended for interactive serving unless latency is relaxed and work can be queued.",
        "owned-hardware": "Advisory only in v1; investigate when compliance, air-gap, or very steady high utilization makes cloud rental the wrong frame."
    };

    const estimateBySlug: Record<ServingModalitySlug, string> = {
        api: `${spend} current spend band`,
        "managed-endpoint": "Provisioned instance-hours + managed premium",
        "serverless-gpu": "Active GPU-seconds + ~0.03 FTE ops",
        "vm-cheap": "Roughly $1.6K–$3.5K/mo before workload tuning",
        "vm-serious": "A100/H100-class node pricing; often $4K–$10K+/mo",
        "batch-gpu": "Active job GPU-hours + orchestration overhead",
        "owned-hardware": "No numeric estimate until amortization/power/colo assumptions are supplied"
    };

    return boundary.serving_modalities
        .map((slug) => {
            const details = detailsBySlug.get(slug);
            const target = slug === "api" ? evaluation.mapped_api_model?.name || profile.hosted_model : candidates;

            return {
                slug,
                label: details?.label || modalityLabel(slug),
                target,
                monthly_estimate: estimateBySlug[slug],
                fit_status: recommendedStatus(slug, preferred, outcome),
                operational_effort: details?.operational_effort || "Medium",
                why: whyBySlug[slug]
            } satisfies ServingOptionRow;
        })
        .sort((a, b) => {
            const score = (row: ServingOptionRow) => {
                if (row.fit_status === "recommended") return 0;
                if (row.fit_status === "baseline") return 1;
                if (row.fit_status === "possible") return 2;
                if (row.fit_status === "advisory") return 3;
                return 4;
            };
            const preferredRank = (row: ServingOptionRow) => {
                const index = preferred.indexOf(row.slug);
                return index === -1 ? Number.POSITIVE_INFINITY : index;
            };

            return score(a) - score(b) || preferredRank(a) - preferredRank(b);
        });
}