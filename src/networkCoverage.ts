/**
 * Multi-warehouse network coverage: aggregate reach across existing DCs.
 * A zone is served if the nearest warehouse can reach it within the day threshold.
 */
import type { Zip3Zone } from './data';
import { distanceMetrics } from './geo';

export interface ServedZone {
  zone: Zip3Zone;
  /** Shortest transit days from any warehouse in the network. */
  min_transit_days: number;
  road_miles: number;
  parcel_zone: number;
  /** ZIP-3 of the closest warehouse serving this zone. */
  nearest_warehouse_zip3: string;
}

export interface NetworkDaySummary {
  dayThreshold: number;
  warehouseCount: number;
  zonesServed: number;
  totalPopulation: number;
  populationPct: number;
  totalDemandIndex: number;
  demandIndexPct: number;
}

/** Best (minimum) transit metrics from any warehouse to a destination zone. */
function bestMetricsFromNetwork(
  warehouses: Zip3Zone[],
  zone: Zip3Zone,
): ServedZone {
  let best = {
    min_transit_days: Infinity,
    road_miles: 0,
    parcel_zone: 0,
    nearest_warehouse_zip3: warehouses[0]?.zip3 ?? '',
  };

  for (const wh of warehouses) {
    const { roadMi, days, zone: parcelZone } = distanceMetrics(
      wh.centroid_lat,
      wh.centroid_lng,
      zone.centroid_lat,
      zone.centroid_lng,
    );
    if (days < best.min_transit_days) {
      best = {
        min_transit_days: days,
        road_miles: roadMi,
        parcel_zone: parcelZone,
        nearest_warehouse_zip3: wh.zip3,
      };
    }
  }

  return {
    zone,
    min_transit_days: best.min_transit_days,
    road_miles: best.road_miles,
    parcel_zone: best.parcel_zone,
    nearest_warehouse_zip3: best.nearest_warehouse_zip3,
  };
}

/** Compute served-zone metrics for every ZIP-3 from a warehouse network. */
export function computeNetworkCoverage(
  warehouses: Zip3Zone[],
  allZones: Zip3Zone[],
): ServedZone[] {
  if (warehouses.length === 0) return [];
  return allZones.map((zone) => bestMetricsFromNetwork(warehouses, zone));
}

/** Summaries at 1-, 2-, and 3-day thresholds for the warehouse network. */
export function computeNetworkDaySummaries(
  warehouses: Zip3Zone[],
  allZones: Zip3Zone[],
  usTotalPopulation: number,
  usTotalDemandIndex: number,
): NetworkDaySummary[] {
  if (warehouses.length === 0) return [];

  const coverage = computeNetworkCoverage(warehouses, allZones);

  return [1, 2, 3].map((dayThreshold) => {
    const served = coverage.filter((z) => z.min_transit_days <= dayThreshold);
    const totalPopulation = served.reduce(
      (sum, z) => sum + (z.zone.population ?? 0),
      0,
    );
    const totalDemandIndex = served.reduce(
      (sum, z) => sum + (z.zone.demand_index ?? 0),
      0,
    );
    return {
      dayThreshold,
      warehouseCount: warehouses.length,
      zonesServed: served.length,
      totalPopulation,
      populationPct:
        usTotalPopulation > 0 ? (totalPopulation / usTotalPopulation) * 100 : 0,
      totalDemandIndex,
      demandIndexPct:
        usTotalDemandIndex > 0
          ? (totalDemandIndex / usTotalDemandIndex) * 100
          : 0,
    };
  });
}

export type NetworkSortKey = 'population' | 'demand_index';

/** Sort served zones for table display. */
export function sortServedZones(
  zones: ServedZone[],
  sortKey: NetworkSortKey,
): ServedZone[] {
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

export interface StateServedGroup {
  state: string;
  zones: ServedZone[];
}

/** Group served zones by state (A→Z), ZIP-3 within each state (A→Z). */
export function groupServedZonesByState(rows: ServedZone[]): StateServedGroup[] {
  const byState = new Map<string, ServedZone[]>();
  for (const row of rows) {
    const st = row.zone.primary_state;
    if (!st) continue;
    const list = byState.get(st) ?? [];
    list.push(row);
    byState.set(st, list);
  }
  return [...byState.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([state, zones]) => ({
      state,
      zones: [...zones].sort((a, b) => a.zone.zip3.localeCompare(b.zone.zip3)),
    }));
}
