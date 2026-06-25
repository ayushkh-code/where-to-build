/**
 * State-level population density tiers for the choropleth map.
 * Population is summed from ZIP-3 zones; land area from state geometries.
 */
import { geoArea } from 'd3-geo';
import type { Feature, Geometry } from 'geojson';
import type { Zip3Zone } from './data';
import {
  FIPS_TO_STATE,
  MAP_HEIGHT,
  MAP_WIDTH,
  STATE_LABEL_NUDGE,
  stateSvgPath,
  stateLabelPoint,
  statesCollection,
} from './map';

const EARTH_RADIUS_M = 6378137;
const SQ_MI_PER_SQ_M = 1 / 2_589_988.110336;

/** Three-tier density palette (low → high). */
export const DENSITY_TIER_COLORS = ['#dbeafe', '#3b82f6', '#1e3a8a'] as const;
export const DENSITY_TIER_LABELS = ['Low', 'Medium', 'High'] as const;
const NO_DATA_COLOR = '#e8ecf1';

export type DensityTier = 0 | 1 | 2;

export interface StateDensity {
  fips: string;
  abbr: string;
  name: string;
  population: number;
  areaSqMi: number;
  density: number;
  tier: DensityTier | null;
  path: string | null;
  labelX: number | null;
  labelY: number | null;
}

/** Land area of a GeoJSON feature in square miles. */
function featureAreaSqMi(feature: Feature<Geometry>): number {
  const sqM = geoArea(feature) * EARTH_RADIUS_M * EARTH_RADIUS_M;
  return sqM * SQ_MI_PER_SQ_M;
}

/** Sum ZIP-3 population by primary_state abbreviation. */
export function aggregatePopulationByState(
  zones: Zip3Zone[],
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const zone of zones) {
    const st = zone.primary_state;
    if (!st) continue;
    totals.set(st, (totals.get(st) ?? 0) + (zone.population ?? 0));
  }
  return totals;
}

/** Assign tertile tier (0=low, 1=med, 2=high) by population density. */
function assignTiers(
  states: Omit<StateDensity, 'tier'>[],
): StateDensity[] {
  const withDensity = states
    .filter((s) => s.population > 0 && s.areaSqMi > 0)
    .sort((a, b) => a.density - b.density);

  const n = withDensity.length;
  if (n === 0) return states.map((s) => ({ ...s, tier: null }));

  const tierByAbbr = new Map<string, DensityTier>();
  const t1 = Math.floor(n / 3);
  const t2 = Math.floor((2 * n) / 3);
  withDensity.forEach((s, i) => {
    let tier: DensityTier = 2;
    if (i < t1) tier = 0;
    else if (i < t2) tier = 1;
    tierByAbbr.set(s.abbr, tier);
  });

  return states.map((s) => ({
    ...s,
    tier:
      s.population > 0 && s.areaSqMi > 0
        ? (tierByAbbr.get(s.abbr) ?? null)
        : null,
  }));
}

/** Tertile density breakpoints for legend (min density per tier). */
export function densityTierRanges(
  states: StateDensity[],
): { tier: DensityTier; label: string; min: number; max: number }[] {
  const tiers = [0, 1, 2] as const;
  return tiers.map((tier) => {
    const inTier = states.filter((s) => s.tier === tier);
    const densities = inTier.map((s) => s.density);
    const min = densities.length ? Math.min(...densities) : 0;
    const max = densities.length ? Math.max(...densities) : 0;
    return {
      tier,
      label: DENSITY_TIER_LABELS[tier],
      min,
      max,
    };
  });
}

/** Build state density records with SVG paths for choropleth rendering. */
export function computeStateDensities(zones: Zip3Zone[]): StateDensity[] {
  const popByState = aggregatePopulationByState(zones);

  const base = statesCollection.features.map((f) => {
    const fips = String(f.id ?? '');
    const abbr = FIPS_TO_STATE[fips] ?? '';
    const name =
      typeof f.properties?.name === 'string' ? f.properties.name : abbr;
    const population = popByState.get(abbr) ?? 0;
    const areaSqMi = featureAreaSqMi(f as Feature<Geometry>);
    const density = areaSqMi > 0 ? population / areaSqMi : 0;
    const centroid = stateLabelPoint(f as Feature<Geometry>);
    const nudge = STATE_LABEL_NUDGE[abbr] ?? [0, 0];

    return {
      fips,
      abbr,
      name,
      population,
      areaSqMi,
      density,
      path: stateSvgPath(f as Feature<Geometry>),
      labelX: centroid ? centroid[0] + nudge[0] : null,
      labelY: centroid ? centroid[1] + nudge[1] : null,
    };
  });

  return assignTiers(base);
}

export function densityFillColor(tier: DensityTier | null): string {
  if (tier === null) return NO_DATA_COLOR;
  return DENSITY_TIER_COLORS[tier];
}

/** Label text color for contrast on each density tier. */
export function densityLabelColor(tier: DensityTier | null): string {
  if (tier === 1 || tier === 2) return '#ffffff';
  return '#1e3a8a';
}

export { MAP_WIDTH, MAP_HEIGHT };
