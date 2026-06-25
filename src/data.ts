/**
 * CSV loading and parsing for ZIP-3 demand reference data.
 */
import Papa from 'papaparse';

/** A single ZIP-3 zone from the reference dataset. */
export interface Zip3Zone {
  zip3: string;
  primary_state: string;
  primary_city: string;
  centroid_lat: number;
  centroid_lng: number;
  zip5_count: number;
  population: number | null;
  households: number | null;
  median_hh_income: number | null;
  demand_index: number | null;
}

const CSV_PATH = '/zip3_demand_reference.csv';

function parseOptionalNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeZip3Input(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 3) return digits.slice(0, 3);
  return digits.padStart(3, '0');
}

/** Normalize user input to a 3-digit ZIP-3 string (preserves leading zeros). */
export function toZip3(raw: string): string {
  return normalizeZip3Input(raw.trim());
}

let cachedZones: Zip3Zone[] | null = null;
let loadPromise: Promise<Zip3Zone[]> | null = null;

function parseRow(row: Record<string, string>): Zip3Zone {
  return {
    zip3: String(row.zip3 ?? '').padStart(3, '0'),
    primary_state: row.primary_state ?? '',
    primary_city: row.primary_city ?? '',
    centroid_lat: parseOptionalNumber(row.centroid_lat) ?? 0,
    centroid_lng: parseOptionalNumber(row.centroid_lng) ?? 0,
    zip5_count: parseOptionalNumber(row.zip5_count) ?? 0,
    population: parseOptionalNumber(row.population),
    households: parseOptionalNumber(row.households),
    median_hh_income: parseOptionalNumber(row.median_hh_income),
    demand_index: parseOptionalNumber(row.demand_index),
  };
}

/** Fetch and parse the ZIP-3 reference CSV (cached after first load). */
export async function loadZip3Data(): Promise<Zip3Zone[]> {
  if (cachedZones) return cachedZones;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const response = await fetch(CSV_PATH);
    if (!response.ok) {
      throw new Error(`Failed to load ${CSV_PATH}: ${response.status}`);
    }
    const text = await response.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    if (parsed.errors.length > 0) {
      console.warn('CSV parse warnings:', parsed.errors);
    }
    cachedZones = parsed.data.map(parseRow);
    return cachedZones;
  })();

  return loadPromise;
}

/** Build a zip3 → zone lookup map. */
export function buildZip3Index(zones: Zip3Zone[]): Map<string, Zip3Zone> {
  return new Map(zones.map((z) => [z.zip3, z]));
}

/** Sum population across all zones (treat null as 0). */
export function totalPopulation(zones: Zip3Zone[]): number {
  return zones.reduce((sum, z) => sum + (z.population ?? 0), 0);
}

/** Sum demand index across all zones (treat null as 0). */
export function totalDemandIndex(zones: Zip3Zone[]): number {
  return zones.reduce((sum, z) => sum + (z.demand_index ?? 0), 0);
}
