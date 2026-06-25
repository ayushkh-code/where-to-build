/**
 * Coverage analysis: compute reachable zones and population/demand summaries
 * from a candidate distribution origin.
 */
import type { Zip3Zone } from './data';
import { distanceMetrics } from './geo';

export interface ReachableZone {
  zone: Zip3Zone;
  transit_days: number;
  parcel_zone: number;
  road_miles: number;
}

export interface DayReachSummary {
  dayThreshold: number;
  zoneCount: number;
  totalPopulation: number;
  totalDemandIndex: number;
  populationPct: number;
}

/** Distance metrics from origin to a single destination zone. */
function metricsForZone(origin: Zip3Zone, zone: Zip3Zone): ReachableZone {
  const { roadMi, days, zone: parcelZone } = distanceMetrics(
    origin.centroid_lat,
    origin.centroid_lng,
    zone.centroid_lat,
    zone.centroid_lng,
  );
  return {
    zone,
    transit_days: days,
    parcel_zone: parcelZone,
    road_miles: roadMi,
  };
}

/** Transit metrics from origin to every zone in the dataset. */
export function computeAllZoneMetrics(
  origin: Zip3Zone,
  allZones: Zip3Zone[],
): ReachableZone[] {
  return allZones.map((zone) => metricsForZone(origin, zone));
}

/** All zones reachable within maxDays transit from origin. */
export function computeReachableZones(
  origin: Zip3Zone,
  allZones: Zip3Zone[],
  maxDays: number,
): ReachableZone[] {
  return computeAllZoneMetrics(origin, allZones).filter(
    (r) => r.transit_days <= maxDays,
  );
}

/** Summary stats for 1-, 2-, and 3-day reach thresholds. */
export function computeDaySummaries(
  origin: Zip3Zone,
  allZones: Zip3Zone[],
  usTotalPopulation: number,
): DayReachSummary[] {
  return [1, 2, 3].map((dayThreshold) => {
    const reachable = computeReachableZones(origin, allZones, dayThreshold);
    const totalPopulation = reachable.reduce(
      (sum, r) => sum + (r.zone.population ?? 0),
      0,
    );
    const totalDemandIndex = reachable.reduce(
      (sum, r) => sum + (r.zone.demand_index ?? 0),
      0,
    );
    return {
      dayThreshold,
      zoneCount: reachable.length,
      totalPopulation,
      totalDemandIndex,
      populationPct:
        usTotalPopulation > 0 ? (totalPopulation / usTotalPopulation) * 100 : 0,
    };
  });
}

export type SortKey = 'population' | 'demand_index';

/** Sort reachable zones by population or demand_index descending. */
export function sortReachable(
  zones: ReachableZone[],
  sortKey: SortKey,
): ReachableZone[] {
  return [...zones].sort((a, b) => {
    const aVal =
      sortKey === 'population'
        ? (a.zone.population ?? 0)
        : (a.zone.demand_index ?? 0);
    const bVal =
      sortKey === 'population'
        ? (b.zone.population ?? 0)
        : (b.zone.demand_index ?? 0);
    return bVal - aVal;
  });
}
