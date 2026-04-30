# Contributing to RunWhere

Thanks for your interest in RunWhere. This guide covers the most common contribution flows: adding a model, updating regime thresholds or assumptions, fixing a bug, and proposing larger changes.

## Before you start

- Run the local pipeline once (`npm install && npm run dev`) to confirm your environment works.

RunWhere is a worked example of the [Precomputed AI](https://precomputedai.com) design pattern. Contributions should reinforce — not weaken — the pattern's properties: versioned artifacts, declared regeneration cadence, visible escalation, stated assumptions.

## Adding a model

### Curation checklist

A model is eligible for inclusion only if **all** hard filters pass:

- [ ] License is Apache 2.0, MIT, or Llama Community License
- [ ] Weights publicly available on Hugging Face Hub
- [ ] vLLM-compatible architecture
- [ ] Hosted by ≥2 OpenRouter providers, or eligible for `tier: preview` with stated rationale
- [ ] Runnable on a single-cloud GPU node (≤8x H100 equivalent)

Soft filters and shape rules (judgment calls):

- [ ] One representative size per family, unless variants serve genuinely different use cases
- [ ] Demonstrated production traction (tooling support, deployments, sustained HF traction)
- [ ] List doesn't exceed ~15 models after the addition; if so, justify which model the new entry displaces

### PR steps

1. Add `src/content/models/<slug>.yaml` with all required schema fields:

```yaml
slug: example-model-7b
name: Example Model 7B
family: Example
vendor: Example AI
license: apache-2.0
hf_id: example-ai/example-model-7b
openrouter_slug: example-ai/example-model-7b
architecture: dense
params_b: 7
active_params_b: 7
tier: stable
added: 2026-04-29
one_liner: One-line description, max 120 characters.
inclusion_rationale: Why this model belongs on the list, citing curation criteria.
```

2. Run validation locally: `npm run validate:content`.
3. Open the PR. Fill out the curation checklist in the PR description (template auto-loads).
4. The next scheduled refresh (or a manual `workflow_dispatch`) will generate artifacts for the new model. You don't need to commit generated files.

### Tier: preview

Use `tier: preview` when a model meets the spirit of the curation criteria but lacks ≥2 OpenRouter providers (typical at launch moments). The artifact will display API-side throughput as estimated, with a banner explaining the preview status. When provider coverage materializes, change to `tier: stable` in a follow-up PR.

## Updating cost formulas or regime thresholds

These changes affect every artifact. Open an issue first to discuss before submitting a PR.

The single source of truth lives in `shared/cost-formulas.ts` and `shared/regime-classifier.ts`. Changes must:

- Include test updates in `shared/__tests__/`
- Bump `ruleset_version` in `package.json` (semver: minor for non-breaking, major for breaking)
- Update the `/methodology` page if the user-facing explanation changes

A regime threshold change (the 1.5x cutoff) is a major version bump. Existing shareable URLs may flip regime; that's a meaningful contract change for users who shared older artifacts.

## Updating GPU specs

`src/content/gpu-specs/*.yaml` holds stable hardware facts (memory, bandwidth, FP16 TFLOPs). Updates:

1. Cite the source (NVIDIA spec sheet, vendor page) in the PR description.
2. Run `npm run validate:content`.
3. Trigger a manual refresh after merge so artifacts pick up the change.

## Updating bounded-opinion defaults

The bounded-opinion defaults (utilization, multipliers, horizon, FTE, peak ratio, etc.) are intentionally opinionated. Changes need:

- A clear rationale grounded in industry data, not preference
- An update to the `/methodology` page explaining the new value and its source
- A `ruleset_version` bump

The user can always adjust these in-page. The defaults only need to be changed if the *typical* assumption has shifted.

## Filing bugs

For bugs:

- Wrong regime call: include the artifact URL, the inputs, and what you expected. The most common cause is a stale pricing snapshot; check the footer date.
- Wrong cost number: include the artifact URL and the source you're comparing against (e.g., GCP pricing page link).
- UI issue: include browser, OS, screenshot.

For data freshness issues, manually triggering the refresh workflow usually resolves them within an hour.

## Proposing larger changes

For changes that touch multiple files or affect the architecture (new dimensions in the matrix, new escalation paths, new pages, new data sources), open an issue with:

- The motivation (what problem does this solve)
- The proposed change (what does the architecture look like after)
- The trade-off (what gets worse, what we lose)
- Whether it's a v1 change or should defer to a future version

Larger changes are easier to land when the motivation is clear and the trade-off is honest.

## Style and quality

- **Code**: ESLint + Prettier configured. Run `npm run lint` before pushing.
- **Tests**: Vitest. New formulas require unit tests. Aim for 100% coverage in `shared/`.
- **Commits**: present-tense, concise. `add: gemma 4 26b model entry`. No need for conventional commits.
- **PRs**: small and focused. One model addition per PR. One formula change per PR. Easier to review, easier to revert.

## Code of conduct

See [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md). Be kind. The project is small enough that everyone matters.

## Security

For security issues, follow [`SECURITY.md`](SECURITY.md). Don't open public issues for vulnerabilities.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
