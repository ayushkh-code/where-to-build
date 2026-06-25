import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Papa from 'papaparse';

const csv = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'zip3_demand_reference.csv'),
  'utf8',
);
const { data } = Papa.parse(csv, { header: true, skipEmptyLines: true });
const rows = data
  .map((r) => ({
    zip3: r.zip3,
    pop: +r.population || null,
    hh: +r.households || null,
    inc: +r.median_hh_income || null,
    di: +r.demand_index || null,
  }))
  .filter((r) => r.pop && r.inc && r.di);

function mape(pred) {
  return (
    rows.reduce((s, r, i) => s + Math.abs(pred[i] - r.di) / r.di, 0) / rows.length
  );
}

const candidates = {
  'pop/40k * sqrt(inc/75k)': (r) => (r.pop / 40000) * Math.sqrt(r.inc / 75000),
  'pop/37k * sqrt(inc/75k)': (r) => (r.pop / 37000) * Math.sqrt(r.inc / 75000),
  'hh*inc/1.35e9': (r) => (r.hh * r.inc) / 1.35e9,
  'pop*inc/3.5e9': (r) => (r.pop * r.inc) / 3.5e9,
  'pop/33.5k': (r) => r.pop / 33500,
};

for (const [name, fn] of Object.entries(candidates)) {
  const preds = rows.map(fn);
  console.log(`${name}: MAPE ${(mape(preds) * 100).toFixed(1)}%`);
}

for (const z of ['100', '021', '900', '006', '005']) {
  const r = rows.find((x) => x.zip3 === z);
  if (!r) continue;
  const pred = (r.pop / 40000) * Math.sqrt(r.inc / 75000);
  console.log(`${z}: actual=${r.di}, est=${pred.toFixed(1)}`);
}
