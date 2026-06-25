# Footprint

Find where to place your next distribution center. Map what your current fulfillment network reaches today, then get data-backed recommendations for where to expand.

**Live app:** [network-siting-explorer.vercel.app](https://network-siting-explorer.vercel.app)

## What it does

- **Reach & Expand** — add warehouse ZIP-3s, view coverage by 1/2/3-day ship speed, and ranked siting alternatives
- **Population Density** — US choropleth of population density by state
- **ZIP-3 Lookup** — demographics and demand index per ZIP-3
- **Methodology** — FAQ on data sources and calculations

## Stack

React 19, TypeScript, Vite, d3-geo, us-atlas, PapaParse. Static deploy on Vercel with a serverless `/api/visitors` counter.

### Visitor count

The hero shows a live visitor tally fetched asynchronously from `/api/visitors`. By default it uses [countapi.xyz](https://countapi.xyz) (no env setup). For a first-party counter, add **Upstash Redis** from the [Vercel Marketplace](https://vercel.com/marketplace?category=storage&search=redis) — the API auto-switches when `UPSTASH_REDIS_REST_*` env vars are present.

## Data

`public/zip3_demand_reference.csv` — 913 US ZIP-3 zones with ACS demographics and a pre-computed demand index. Transit days and parcel zones are computed client-side from zone centroids.

## Local development

```bash
npm install
npm run dev
```

```bash
npm run build
npm run preview
```

## Deploy

```bash
npx vercel deploy --prod
```

## Rebuild from scratch

See [where-to-build-prompt.md](./where-to-build-prompt.md) for the Cursor/Claude prompt used to scaffold and extend this app.
