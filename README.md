# Where to build

Evaluate distribution node locations against US demand geography.

**Live app:** [network-siting-explorer.vercel.app](https://network-siting-explorer.vercel.app)

## What it does

- **Coverage Analysis** — single-origin reach by 1/2/3-day ground transit
- **State Density** — US choropleth of population density
- **Current network reach** — multi-warehouse demand and population served
- **ZIP-3 Lookup** — demographics and demand index per ZIP-3
- **Methodology** — FAQ on data sources and calculations

## Stack

React 19, TypeScript, Vite, d3-geo, us-atlas, PapaParse. Static deploy on Vercel.

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
