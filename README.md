# RunWhere

RunWhere is a free, fast, no-login web tool that helps practitioners decide whether to self-host an open-weight model or stay on a hosted API, and a worked example of the [Precomputed AI](https://precomputedai.com) design pattern.

The user picks an open-weight model, a target cloud (GCP, AWS, or Azure), and a rough usage shape. RunWhere returns a directional regime classification — *self-host wins clearly*, *API wins clearly*, or *close call where operational preferences dominate* — with a crossover chart, the assumptions behind the answer, and a stable shareable URL.

Precomputed AI citation: Raquedan, R. (2026). *Precomputed AI: Reason Ahead of Time, Serve Instantly.* https://precomputedai.com

Production URL: `https://runwhere.dev`

Firebase project: `runwhere-web`

## What RunWhere is

The third worked example in the Precomputed AI trilogy:

- [RightModel.dev](https://rightmodel.dev) demonstrates **Ruleset Compilation** (which model)
- [CloudEstimate.dev](https://cloudestimate.dev) demonstrates **Scheduled Generation** (how much it costs)
- **RunWhere.dev** demonstrates **Constraint Baking** (where to run it)

A static Astro site backed by per-(model, cloud) JSON artifacts regenerated weekly for pricing and quarterly for throughput. Bounded-opinion defaults are stated, sources are labeled (calculated / cited / measured), and users can adjust assumptions in-page to test whether the regime call holds. A single Vertex AI–backed Cloud Run Function provides opt-in live analysis for close-call regimes.

## What RunWhere is NOT

- Not a precise cost calculator — that is spreadsheet work.
- Not a SaaS — no accounts, no usage tracking, no billing.
- Not a vendor recommendation engine — neutral on hosted vs. self-host, biased only toward telling the truth about which regime the user is in.

## Current roster

12 curated open-weight models at v1 launch. The canonical roster lives in `src/content/models/`.

## What is in this repo

- Static Astro site for the homepage, per-composition pages, methodology, and changelog
- Schema-validated model and GPU catalogs in `src/content/`
- Shared cost formulas and regime classifier in `shared/`
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
