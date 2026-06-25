/**
 * Pure geographic / logistics heuristic functions for network siting analysis.
 * No external APIs; all distance and transit estimates are computed client-side.
 */

/** Earth radius in miles (standard mean value for haversine). */
const EARTH_RADIUS_MI = 3958.8;

/** Road-distance multiplier applied to great-circle distance. */
const ROAD_FACTOR = 1.17;

/**
 * Great-circle distance between two lat/lng points in statute miles.
 */
export function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_MI * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Approximate over-the-road miles from great-circle distance. */
export function roadMiles(gcMiles: number): number {
  return gcMiles * ROAD_FACTOR;
}

/**
 * Estimated ground transit days from origin to destination (road miles).
 * Validated heuristics for standard parcel/ground logistics networks.
 */
export function transitDays(roadMi: number): number {
  if (roadMi <= 150) return 1;
  if (roadMi <= 350) return 2;
  if (roadMi <= 600) return 3;
  if (roadMi <= 1000) return 4;
  if (roadMi <= 1400) return 5;
  if (roadMi <= 1800) return 6;
  return 7;
}

/**
 * Parcel carrier zone estimate from road miles (zone 2–8).
 * Higher zones correspond to longer haul distances.
 */
export function parcelZone(roadMi: number): number {
  if (roadMi <= 50) return 2;
  if (roadMi <= 150) return 3;
  if (roadMi <= 300) return 4;
  if (roadMi <= 600) return 5;
  if (roadMi <= 1000) return 6;
  if (roadMi <= 1400) return 7;
  return 8;
}

/** Compute road miles and derived logistics metrics between two centroids. */
export function distanceMetrics(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): { gcMiles: number; roadMi: number; days: number; zone: number } {
  const gcMiles = haversine(originLat, originLng, destLat, destLng);
  const roadMi = roadMiles(gcMiles);
  return {
    gcMiles,
    roadMi,
    days: transitDays(roadMi),
    zone: parcelZone(roadMi),
  };
}
