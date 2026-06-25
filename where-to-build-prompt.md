# Where to build — build prompt

Use this prompt in Cursor or Claude to scaffold or extend the Network Siting Explorer app.

---

## Prompt

Build a React + Vite + TypeScript web app called **Where to build** that helps supply chain leaders evaluate distribution node locations against US demand geography.

### Data

- Load `public/zip3_demand_reference.csv` (913 US ZIP-3 zones).
- Each row: `zip3`, `primary_city`, `primary_state`, lat/lon centroid, `population`, `households`, `median_hh_income`, `demand_index`, `zip5_count`.
- Demand index is pre-computed in the CSV (unitless relative score from population + income signals). Do not recalculate it in the app.
- Demographics are US Census ACS 5-year estimates aggregated from ZCTA to ZIP-3.

### Geography & logistics (client-side)

- Great-circle miles: haversine (Earth radius 3,958.8 mi).
- Road miles: great-circle × 1.17.
- Transit days: ≤150 mi → 1 day, ≤350 → 2, ≤600 → 3, ≤1,000 → 4, ≤1,400 → 5, ≤1,800 → 6, else 7.
- Parcel zone: road miles → zones 2–8 (≤50 → 2, ≤150 → 3, ≤300 → 4, ≤600 → 5, ≤1,000 → 6, ≤1,400 → 7, else 8).

### Tabs (in this order)

1. **Coverage Analysis** — append candidate warehouse ZIP-3(s); show population/demand reach within 1/2/3 days from selected origin; US map (Albers) with dots sized by population and colored by transit bucket; sortable reachable-zone table.
2. **State Density** — 3-tier choropleth of population density by state with state initials.
3. **Current network reach** — multiple warehouse ZIPs; assign each demand zone to nearest DC by transit days; show demand % and population % served above the map; served ZIPs grouped by state in tables.
4. **ZIP-3 Lookup** — detail cards for saved ZIPs (population, households, income, demand index).
5. **Methodology** — FAQ page (data sources, ZIP-3 definition, demand index, transit math, coverage logic, limitations). No duplicate methodology footer on other tabs.

### UX requirements

- **One ZIP input per tab** — single embedded input inside each tab panel (not a duplicate global bar). ZIP-3 Lookup hides chip list (cards show locations). Shared `savedZip3s` state persists across tabs.
- Tab purpose one-liner at top of each tab.
- Deploy to Vercel as a static Vite SPA (`vercel.json` rewrites to `index.html`).
- Use short dashes in copy, not em dashes.

### Tech

- `d3-geo` + `us-atlas` for maps.
- `papaparse` for CSV.
- No backend; all computation in the browser.

### Sanity checks

- NYC ZIP-3 `100` should reach ~200 zones within 2 days.
- LA ZIP-3 `900` should reach ~40–50 zones within 2 days.

---

## Extensions (optional follow-ups)

- Compare two candidate nodes side by side.
- Export served ZIP list as CSV.
- Link Vercel project to GitHub for CI deploy on push.
