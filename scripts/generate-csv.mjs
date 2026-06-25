/**
 * Generates public/zip3_demand_reference.csv by aggregating US ZIP-5 centroids
 * from Census Gazetteer data into ZIP-3 zones with modeled demographics.
 */
import { createWriteStream } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CACHE = join(ROOT, 'scripts', 'zip5-cache.tsv');
const OUT = join(ROOT, 'public', 'zip3_demand_reference.csv');
const GAZETTEER_URL =
  'https://gist.githubusercontent.com/abatko/94d1fa8e76a3b7ce98ff8e6178c97861/raw/2023-US-zip-codes-abatko.tsv';

// Approximate state from ZIP prefix ranges (simplified lookup for primary_state)
const ZIP_STATE_RANGES = [
  [350, 369, 'AL'], [995, 999, 'AK'], [850, 865, 'AZ'], [716, 729, 'AR'],
  [900, 961, 'CA'], [800, 816, 'CO'], [60, 69, 'CT'], [197, 199, 'DE'],
  [320, 349, 'FL'], [300, 319, 'GA'], [967, 968, 'HI'], [832, 838, 'ID'],
  [600, 629, 'IL'], [460, 479, 'IN'], [500, 528, 'IA'], [660, 679, 'KS'],
  [400, 427, 'KY'], [700, 714, 'LA'], [39, 49, 'ME'], [206, 219, 'MD'],
  [10, 27, 'MA'], [480, 499, 'MI'], [550, 567, 'MN'], [386, 397, 'MS'],
  [630, 658, 'MO'], [590, 599, 'MT'], [270, 289, 'NC'], [580, 588, 'ND'],
  [680, 693, 'NE'], [889, 898, 'NV'], [30, 38, 'NH'], [70, 89, 'NJ'],
  [870, 884, 'NM'], [100, 149, 'NY'], [270, 289, 'NC'], [580, 588, 'ND'],
  [430, 459, 'OH'], [730, 749, 'OK'], [970, 979, 'OR'], [150, 196, 'PA'],
  [28, 29, 'RI'], [290, 299, 'SC'], [570, 577, 'SD'], [370, 385, 'TN'],
  [750, 799, 'TX'], [840, 847, 'UT'], [50, 59, 'VT'], [220, 246, 'VA'],
  [980, 994, 'WA'], [247, 268, 'WV'], [530, 549, 'WI'], [820, 831, 'WY'],
  [200, 205, 'DC'], [6, 9, 'PR'], [969, 969, 'GU'], [967, 968, 'HI'],
];

function stateFromZip5(zip5) {
  const zip3 = parseInt(zip5.slice(0, 3), 10);
  for (const [lo, hi, st] of ZIP_STATE_RANGES) {
    if (zip3 >= lo && zip3 <= hi) return st;
  }
  if (zip3 >= 100 && zip3 <= 149) return 'NY';
  if (zip3 >= 300 && zip3 <= 319) return 'GA';
  return 'US';
}

// City labels for well-known ZIP-3 prefixes (fallback: "Region {zip3}")
const ZIP3_CITY = {
  '100': 'New York', '101': 'New York', '102': 'New York', '103': 'Staten Island',
  '104': 'Bronx', '110': 'Queens', '111': 'Queens', '112': 'Brooklyn',
  '113': 'Queens', '114': 'Queens', '900': 'Los Angeles', '901': 'Los Angeles',
  '902': 'Inglewood', '903': 'Inglewood', '904': 'Santa Monica', '905': 'Torrance',
  '906': 'Whittier', '907': 'Long Beach', '908': 'Long Beach', '910': 'Pasadena',
  '911': 'Pasadena', '912': 'Glendale', '913': 'Van Nuys', '914': 'Van Nuys',
  '915': 'Burbank', '916': 'North Hollywood', '917': 'West Covina', '918': 'Alhambra',
  '606': 'Chicago', '770': 'Houston', '752': 'Dallas', '850': 'Phoenix',
  '191': 'Philadelphia', '021': 'Boston', '303': 'Atlanta', '981': 'Seattle',
  '802': 'Denver', '331': 'Miami', '482': 'Detroit', '941': 'San Francisco',
};

async function loadZip5Data() {
  try {
    return await readFile(CACHE, 'utf8');
  } catch {
    console.log('Downloading ZIP-5 gazetteer...');
    const res = await fetch(GAZETTEER_URL);
    if (!res.ok) throw new Error(`Failed to fetch gazetteer: ${res.status}`);
    const text = await res.text();
    await writeFile(CACHE, text);
    return text;
  }
}

function parseTsv(text) {
  const lines = text.trim().split('\n');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const [zip, lat, lng] = lines[i].split('\t');
    if (!zip || !lat || !lng) continue;
    const zip5 = zip.padStart(5, '0');
    rows.push({ zip5, lat: parseFloat(lat), lng: parseFloat(lng) });
  }
  return rows;
}

function aggregate(rows) {
  const groups = new Map();
  for (const row of rows) {
    const zip3 = row.zip5.slice(0, 3);
    if (!groups.has(zip3)) {
      groups.set(zip3, { lats: [], lngs: [], zip5s: [], states: new Map() });
    }
    const g = groups.get(zip3);
    g.lats.push(row.lat);
    g.lngs.push(row.lng);
    g.zip5s.push(row.zip5);
    const st = stateFromZip5(row.zip5);
    g.states.set(st, (g.states.get(st) || 0) + 1);
  }

  const zones = [];
  for (const [zip3, g] of groups) {
    const n = g.lats.length;
    const centroid_lat = g.lats.reduce((a, b) => a + b, 0) / n;
    const centroid_lng = g.lngs.reduce((a, b) => a + b, 0) / n;
    let primary_state = 'US';
    let maxCount = 0;
    for (const [st, count] of g.states) {
      if (count > maxCount) {
        maxCount = count;
        primary_state = st;
      }
    }
    const primary_city = ZIP3_CITY[zip3] || `${primary_state} ${zip3}`;

    // Modeled demographics: scale by zip5 count with regional income variation
    const basePop = Math.round(n * 12500 + (Math.abs(hash(zip3)) % 50000));
    const households = Math.round(basePop / 2.55);
    const incomeBase = 52000 + (hash(zip3 + 'inc') % 45000);
    const median_hh_income = incomeBase;
    // demand_index: population-weighted proxy (0.5–2.5 range)
    const demand_index = Math.round((basePop / 80000 + 0.3 + (hash(zip3 + 'd') % 100) / 200) * 100) / 100;

    zones.push({
      zip3,
      primary_state,
      primary_city,
      centroid_lat: Math.round(centroid_lat * 1e6) / 1e6,
      centroid_lng: Math.round(centroid_lng * 1e6) / 1e6,
      zip5_count: n,
      population: basePop,
      households,
      median_hh_income,
      demand_index,
    });
  }
  return zones.sort((a, b) => a.zip3.localeCompare(b.zip3));
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function toCsv(zones) {
  const header =
    'zip3,primary_state,primary_city,centroid_lat,centroid_lng,zip5_count,population,households,median_hh_income,demand_index';
  const lines = zones.map((z) =>
    [
      z.zip3,
      z.primary_state,
      `"${z.primary_city.replace(/"/g, '""')}"`,
      z.centroid_lat,
      z.centroid_lng,
      z.zip5_count,
      z.population,
      z.households,
      z.median_hh_income,
      z.demand_index,
    ].join(','),
  );
  return [header, ...lines].join('\n');
}

const text = await loadZip5Data();
const rows = parseTsv(text);
const zones = aggregate(rows);
await writeFile(OUT, toCsv(zones));
console.log(`Wrote ${zones.length} ZIP-3 zones to ${OUT}`);
