# RunWhere

RunWhere is a free, fast, no-login web tool for the 2026 default: **use the hosted API unless your workload is one of the exceptions**. It is also a worked example of the [Precomputed AI](https://precomputedai.com) design pattern.

The homepage gives the answer first: API economics win for the overwhelming majority of typical workloads. Users who suspect they are outliers can run a short check — current API spend, hosted model, traffic shape, and hard constraints — to see whether their situation belongs in the exception set. Most results confirm “stay on the API”; the interesting minority compares relevant serving modalities such as managed endpoints, serverless GPU, cheap always-on GPU VMs, scheduled batch GPU, serious GPU VMs, and owned/on-prem hardware against the API path.

The original open-weight composer remains as a secondary advanced path for users who already know the model, cloud, GPU, quantization, and usage shape they want to inspect. Cost uses blended input/output tokens, while serving capacity is checked against output-token peak so high-throughput scenarios are not reduced to cost alone.

Precomputed AI citation: Raquedan, R. (2026). *Precomputed AI: Reason Ahead of Time, Serve Instantly.* https://precomputedai.com

Production URL: `https://runwhere.dev`

Firebase project: `runwhere-web`

## What RunWhere is

The third worked example in the Precomputed AI trilogy:

- [RightModel.dev](https://rightmodel.dev) demonstrates **Ruleset Compilation** (which model)
- [CloudEstimate.dev](https://cloudestimate.dev) demonstrates **Scheduled Generation** (how much it costs)
- **RunWhere.dev** demonstrates **Constraint Baking** (where to run it)

A static Astro site backed by versioned JSON artifacts regenerated weekly for pricing and quarterly for throughput. The primary artifact bakes the boundary of the API-first conclusion; advanced per-(open-weight model, cloud) artifacts remain available for detailed inspection. Bounded-opinion defaults are stated, sources are labeled (calculated / cited / measured), and users can adjust assumptions in-page to test whether the call holds. A single Vertex AI–backed Cloud Run Function provides opt-in live analysis for likely outliers, hard constraints, and advanced close calls.

## What RunWhere is NOT

- Not a precise cost calculator — that is spreadsheet work.
- Not a SaaS — no accounts, no usage tracking, no billing.
- Not a vendor recommendation engine — API-first because the data usually points there, but biased only toward telling the truth about whether the user is an exception.

## Current roster

12 curated open-weight models at v1 launch, used primarily as self-host candidates mapped from hosted API models. The canonical roster lives in `src/content/models/`; API-to-open-weight mappings live in `src/content/api-mappings/`; serving modality defaults live in `src/content/serving-modalities/`.

## What is in this repo

- Static Astro site for the API-first homepage, four-question check, shareable check results, advanced per-composition pages, methodology, and changelog
- Schema-validated model, GPU, API-model mapping, and serving-modality catalogs in `src/content/`
- Shared cost formulas, boundary evaluation, and regime classifier in `shared/`
- Cloud Run Function for opt-in escalation in `functions/`
- GitHub Actions workflows for weekly pricing and quarterly throughput refreshes
- Firebase Hosting deploy wiring

## Getting started

```bash
npm install
npm install --prefix functions
npm run validate:content
npm run dev
```

If you are working on the Cloud Run Function or shared generated data, run:

```bash
npm run sync:functions-data
```

## Local configuration

Copy `.env.example` to `.env` to test canonical URLs, analytics tags, or Turnstile keys.

Available local env vars:

- `PUBLIC_SITE_URL`
- `PUBLIC_GA4_MEASUREMENT_ID`
- `PUBLIC_GOOGLE_SITE_VERIFICATION`
- `PUBLIC_TURNSTILE_SITE_KEY`

`PUBLIC_SITE_URL` is required for production builds so canonical URLs, robots output, and the sitemap point at the real site. In local dev, the app falls back to `http://localhost:4321`.

In GitHub Actions, public configuration belongs in repository or environment variables. Secrets such as `GCP_SA_KEY` and `TURNSTILE_SECRET_KEY` belong in GitHub Actions Secrets.

## Scheduled data refresh architecture

Pricing and throughput data are refreshed in GitHub Actions and committed into `src/data/generated/**`. The build reads those committed JSON files.

- Weekly pricing snapshot: `.github/workflows/refresh-pricing.yml`
- Quarterly throughput snapshot: `.github/workflows/refresh-throughput.yml`

The pricing workflow calls Google Cloud Billing Catalog, then AWS Pricing API, then Azure Retail Prices API, then OpenRouter `/api/v1/models`.

The throughput workflow re-fetches Hugging Face Hub model facts and OpenRouter `/api/v1/models/:author/:slug/endpoints` measured throughput per provider.

Manual local equivalents:

```bash
npm run refresh:pricing
npm run refresh:throughput
```

The minimum GitHub Actions setup is `GCP_SA_KEY` as a secret, plus `RUNWHERE_GCP_PROJECT_ID` and `PUBLIC_SITE_URL` as variables.

## Quality checks

```bash
npm run validate:content
npm run lint
npm run test
npm run check:functions
npm run build
```

## License

MIT. See [LICENSE](LICENSE).
