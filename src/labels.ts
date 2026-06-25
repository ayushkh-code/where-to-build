/** User-facing copy for ZIP-3 terminology. */
export const ZIP3_HELP = '(i.e., first 3 digits of a ZIP code)';

export function zip3Label(suffix = ''): string {
  return suffix ? `ZIP-3 ${ZIP3_HELP} ${suffix}` : `ZIP-3 ${ZIP3_HELP}`;
}

/** Explainer shown on transit-day hover tooltips. */
export const TRANSIT_DAYS_TOOLTIP =
  'Transit days estimate ground shipping time from road miles. Road miles ≈ great-circle distance between zone centroids × 1.17. Day buckets: ≤150 mi → 1 day, ≤350 mi → 2 days, ≤600 mi → 3 days, ≤1,000 mi → 4 days, ≤1,400 mi → 5 days, ≤1,800 mi → 6 days, else 7 days.';

export const EMPTY_WAREHOUSE_PROMPT =
  'Add a warehouse ZIP-3 above to map your coverage.';

/** Hover tooltip on Ship speed superscript (1/2/3-day mile thresholds). */
export const SHIP_SPEED_MILE_TOOLTIP =
  '1d / 2d / 3d = 150 / 350 / 600 road miles';

/** Short visible explainer for transit-day methodology (all tabs). */
export const TRANSIT_DAYS_ONELINER =
  'Great-circle miles between zone centroids × 1.17 ≈ road miles; ≤150 mi → 1 day, ≤350 mi → 2 days, ≤600 mi → 3 days.';
