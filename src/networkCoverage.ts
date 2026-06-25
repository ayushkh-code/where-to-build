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

export type MaximizeObjective = 'demand_index' | 'population' | 'zones';

/** Ranked backup alternatives shown in the expansion planner. */
export const RECOMMENDATION_ALTERNATIVE_COUNT = 5;

export interface NodeRecommendation {
  rank: number;
  zone: Zip3Zone;
  /** Additional objective units captured by this node (given prior picks). */
  incrementalGain: number;
  demandIndexPct: number;
  populationPct: number;
  zonesServed: number;
}

function incrementalObjectiveGain(
  coverage: ServedZone[],
  candidate: Zip3Zone,
  dayThreshold: number,
  objective: MaximizeObjective,
): number {
  let gain = 0;
  for (const row of coverage) {
    const { days } = distanceMetrics(
      candidate.centroid_lat,
      candidate.centroid_lng,
      row.zone.centroid_lat,
      row.zone.centroid_lng,
    );
    const wasServed = row.min_transit_days <= dayThreshold;
    const nowServed = Math.min(row.min_transit_days, days) <= dayThreshold;
    if (!wasServed && nowServed) {
      if (objective === 'demand_index') {
        gain += row.zone.demand_index ?? 0;
      } else if (objective === 'population') {
        gain += row.zone.population ?? 0;
      } else {
        gain += 1;
      }
    }
  }
  return gain;
}

function mergeWarehouseIntoCoverage(
  coverage: ServedZone[],
  warehouse: Zip3Zone,
): ServedZone[] {
  return coverage.map((row) => {
    const { roadMi, days, zone: parcelZone } = distanceMetrics(
      warehouse.centroid_lat,
      warehouse.centroid_lng,
      row.zone.centroid_lat,
      row.zone.centroid_lng,
    );
    if (days < row.min_transit_days) {
      return {
        ...row,
        min_transit_days: days,
        road_miles: roadMi,
        parcel_zone: parcelZone,
        nearest_warehouse_zip3: warehouse.zip3,
      };
    }
    return row;
  });
}

function summaryAtThreshold(
  coverage: ServedZone[],
  dayThreshold: number,
  usTotalPopulation: number,
  usTotalDemandIndex: number,
): Pick<NodeRecommendation, 'demandIndexPct' | 'populationPct' | 'zonesServed'> {
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
    zonesServed: served.length,
    populationPct:
      usTotalPopulation > 0 ? (totalPopulation / usTotalPopulation) * 100 : 0,
    demandIndexPct:
      usTotalDemandIndex > 0
        ? (totalDemandIndex / usTotalDemandIndex) * 100
        : 0,
  };
}

function buildExcludedZip3Set(
  existingWarehouses: Zip3Zone[],
  excludedZip3s: Iterable<string> = [],
): Set<string> {
  const excluded = new Set(existingWarehouses.map((w) => w.zip3));
  for (const zip3 of excludedZip3s) {
    excluded.add(zip3);
  }
  return excluded;
}

/**
 * Top N site alternatives ranked by incremental gain from the current network.
 * Each option is evaluated independently (pick one), not as a build-all sequence.
 */
export function recommendNextSiteAlternatives(
  existingWarehouses: Zip3Zone[],
  allZones: Zip3Zone[],
  alternativeCount: number,
  dayThreshold: number,
  objective: MaximizeObjective,
  usTotalPopulation: number,
  usTotalDemandIndex: number,
  excludedZip3s: Iterable<string> = [],
): NodeRecommendation[] {
  if (existingWarehouses.length === 0 || alternativeCount < 1) return [];

  const excluded = buildExcludedZip3Set(existingWarehouses, excludedZip3s);
  const coverage = computeNetworkCoverage(existingWarehouses, allZones);

  const ranked = allZones
    .filter((zone) => !excluded.has(zone.zip3))
    .map((zone) => ({
      zone,
      gain: incrementalObjectiveGain(
        coverage,
        zone,
        dayThreshold,
        objective,
      ),
    }))
    .filter((row) => row.gain > 0)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, alternativeCount);

  return ranked.map((row, index) => {
    const projectedCoverage = mergeWarehouseIntoCoverage(coverage, row.zone);
    const projected = summaryAtThreshold(
      projectedCoverage,
      dayThreshold,
      usTotalPopulation,
      usTotalDemandIndex,
    );
    return {
      rank: index + 1,
      zone: row.zone,
      incrementalGain: row.gain,
      ...projected,
    };
  });
}

/**
 * Greedy siting: pick up to `nodeCount` ZIP-3 candidates that maximize the
 * chosen objective within `dayThreshold`, given existing warehouses.
 */
export function recommendAdditionalNodes(
  existingWarehouses: Zip3Zone[],
  allZones: Zip3Zone[],
  nodeCount: number,
  dayThreshold: number,
  objective: MaximizeObjective,
  usTotalPopulation: number,
  usTotalDemandIndex: number,
  excludedZip3s: Iterable<string> = [],
): NodeRecommendation[] {
  if (existingWarehouses.length === 0 || nodeCount < 1) return [];

  const usedZip3s = buildExcludedZip3Set(existingWarehouses, excludedZip3s);
  let coverage = computeNetworkCoverage(existingWarehouses, allZones);
  const recommendations: NodeRecommendation[] = [];

  for (let rank = 1; rank <= nodeCount; rank++) {
    let bestZone: Zip3Zone | null = null;
    let bestGain = -1;

    for (const candidate of allZones) {
      if (usedZip3s.has(candidate.zip3)) continue;
      const gain = incrementalObjectiveGain(
        coverage,
        candidate,
        dayThreshold,
        objective,
      );
      if (gain > bestGain) {
        bestGain = gain;
        bestZone = candidate;
      }
    }

    if (!bestZone || bestGain <= 0) break;

    usedZip3s.add(bestZone.zip3);
    coverage = mergeWarehouseIntoCoverage(coverage, bestZone);
    const projected = summaryAtThreshold(
      coverage,
      dayThreshold,
      usTotalPopulation,
      usTotalDemandIndex,
    );

    recommendations.push({
      rank,
      zone: bestZone,
      incrementalGain: bestGain,
      ...projected,
    });
  }

  return recommendations;
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
