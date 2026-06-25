/**
 * Sanity-check geo heuristics against expected NYC(100) and LA(900) coverage.
 * Run: node scripts/sanity-check.mjs
 */
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV = join(__dirname, '..', 'public', 'zip3_demand_reference.csv');

const EARTH_RADIUS_MI = 3958.8;
const ROAD_FACTOR = 1.17;

function haversine(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_MI * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function roadMiles(gc) {
  return gc * ROAD_FACTOR;
}

function transitDays(roadMi) {
  if (roadMi <= 150) return 1;
  if (roadMi <= 350) return 2;
  if (roadMi <= 600) return 3;
  if (roadMi <= 1000) return 4;
  if (roadMi <= 1400) return 5;
  if (roadMi <= 1800) return 6;
  return 7;
}

function parseCsv(text) {
  const lines = text.trim().split('\n');
  const header = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const parts = line.match(/(".*?"|[^,]+)/g) ?? [];
    const row = {};
    header.forEach((h, i) => {
      let v = parts[i] ?? '';
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      row[h.trim()] = v;
    });
    return row;
  });
}

function countWithinDays(originZip3, zones, maxDays) {
  const origin = zones.find((z) => z.zip3 === originZip3);
  if (!origin) throw new Error(`Origin ${originZip3} not found`);
  const oLat = parseFloat(origin.centroid_lat);
  const oLng = parseFloat(origin.centroid_lng);
  let count = 0;
  for (const z of zones) {
    const gc = haversine(oLat, oLng, parseFloat(z.centroid_lat), parseFloat(z.centroid_lng));
    const days = transitDays(roadMiles(gc));
    if (days <= maxDays) count++;
  }
  return count;
}

const text = await readFile(CSV, 'utf8');
const zones = parseCsv(text).map((r) => ({ ...r, zip3: r.zip3.padStart(3, '0') }));

console.log(`Loaded ${zones.length} zones`);

const nyc2 = countWithinDays('100', zones, 2);
const la2 = countWithinDays('900', zones, 2);

console.log(`NYC (100) 2-day reach: ${nyc2} zones (expected ~201)`);
console.log(`LA (900) 2-day reach: ${la2} zones (expected ~43)`);

const nycOk = nyc2 >= 170 && nyc2 <= 230;
const laOk = la2 >= 30 && la2 <= 55;

if (!nycOk || !laOk) {
  console.error('Sanity check FAILED: adjust centroids or thresholds');
  process.exit(1);
}
console.log('Sanity check PASSED');
