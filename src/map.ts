/**
 * US map projection and styling helpers for coverage visualization.
 */
import { geoAlbersUsa, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { Topology } from 'topojson-specification';
import statesTopo from 'us-atlas/states-10m.json';

export const MAP_WIDTH = 975;
export const MAP_HEIGHT = 610;

/** Transit-day fill colors (within selected threshold). */
export const DAY_COLORS: Record<number, string> = {
  1: '#15803d',
  2: '#65a30d',
  3: '#ca8a04',
};

const OUT_OF_RANGE_COLOR = '#cbd5e1';
const ORIGIN_COLOR = '#1a56db';

const topology = statesTopo as unknown as Topology;
export const statesCollection = feature(
  topology,
  topology.objects.states,
) as FeatureCollection<Geometry>;

/** Census state FIPS → 2-letter abbreviation (50 states + DC + PR). */
export const FIPS_TO_STATE: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO',
  '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI',
  '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY',
  '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN',
  '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH',
  '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD',
  '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA',
  '54': 'WV', '55': 'WI', '56': 'WY', '72': 'PR',
};

/** Pixel nudges for state abbreviation labels on small or crowded states. */
export const STATE_LABEL_NUDGE: Record<string, [number, number]> = {
  CT: [-4, -6],
  DC: [12, 4],
  DE: [8, 2],
  LA: [0, 8],
  MA: [-6, 0],
  MD: [10, 4],
  NH: [8, -8],
  NJ: [0, 8],
  RI: [10, 4],
  VT: [0, -6],
};

export interface StateMapLabel {
  fips: string;
  abbr: string;
  name: string;
  x: number;
  y: number;
}

/** Projected label positions for all US states (+ DC, PR). */
export function getStateMapLabels(): StateMapLabel[] {
  return statesCollection.features
    .map((f) => {
      const fips = String(f.id ?? '');
      const abbr = FIPS_TO_STATE[fips] ?? '';
      const name =
        typeof f.properties?.name === 'string' ? f.properties.name : abbr;
      const centroid = stateLabelPoint(f as Feature<Geometry>);
      if (!abbr || !centroid) return null;
      const nudge = STATE_LABEL_NUDGE[abbr] ?? [0, 0];
      return {
        fips,
        abbr,
        name,
        x: centroid[0] + nudge[0],
        y: centroid[1] + nudge[1],
      };
    })
    .filter((l): l is StateMapLabel => l !== null);
}

const projection = geoAlbersUsa()
  .scale(1280)
  .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);

const pathGenerator = geoPath(projection);

/** SVG path for a state feature in the shared Albers USA projection. */
export function stateSvgPath(feature: Feature<Geometry>): string | null {
  return pathGenerator(feature) ?? null;
}

/** Projected centroid for state abbreviation labels. */
export function stateLabelPoint(
  feature: Feature<Geometry>,
): [number, number] | null {
  const c = pathGenerator.centroid(feature);
  if (!c || Number.isNaN(c[0]) || Number.isNaN(c[1])) return null;
  return c;
}

/** SVG path data for US state outlines. */
export const statePaths: { id: string; d: string | null }[] =
  statesCollection.features.map((f) => ({
    id: String(f.id ?? ''),
    d: pathGenerator(f) ?? null,
  }));

/** Project lat/lng to SVG [x, y], or null if outside the Albers USA clip. */
export function projectPoint(
  lat: number,
  lng: number,
): [number, number] | null {
  const p = projection([lng, lat]);
  if (!p || Number.isNaN(p[0]) || Number.isNaN(p[1])) return null;
  return p;
}

/** Dot radius scaled by population (visual weight, not geographic). */
export function dotRadius(population: number | null, isOrigin: boolean): number {
  if (isOrigin) return 7;
  if (!population) return 2.5;
  return Math.min(9, Math.max(2.5, 1.8 + Math.sqrt(population / 180_000)));
}

export function zoneFillColor(
  transitDays: number,
  withinThreshold: boolean,
  isOrigin: boolean,
): string {
  if (isOrigin) return ORIGIN_COLOR;
  if (!withinThreshold) return OUT_OF_RANGE_COLOR;
  if (transitDays <= 3) return DAY_COLORS[transitDays] ?? OUT_OF_RANGE_COLOR;
  return '#94a3b8';
}

export function zoneOpacity(
  transitDays: number,
  dayThreshold: number,
  isOrigin: boolean,
): number {
  if (isOrigin) return 1;
  if (transitDays <= dayThreshold) return 0.85;
  return 0.18;
}
