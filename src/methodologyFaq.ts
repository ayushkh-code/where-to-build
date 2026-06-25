import { TRANSIT_DAYS_ONELINER } from './labels';

/** Methodology FAQ entries for the Methodology tab. */
export interface MethodologyFaqItem {
  question: string;
  paragraphs: string[];
  bullets?: string[];
}

export const METHODOLOGY_FAQ: MethodologyFaqItem[] = [
  {
    question: 'How is 1/2/3-day reach calculated?',
    paragraphs: [TRANSIT_DAYS_ONELINER],
  },
  {
    question: 'Where does the demographic data come from?',
    paragraphs: [
      "Population, households, and median household income are sourced from the US Census Bureau's American Community Survey (ACS) 5-year estimates, aggregated from the ZIP Code Tabulation Area (ZCTA) level up to ZIP-3. This is official, public, government data covering roughly 334 million people across 889 populated ZIP-3 zones. A small number of ZIP-3 zones (PO-box-only or non-residential) have no Census population and appear without demographic figures.",
    ],
  },
  {
    question: 'What is a ZIP-3 and why use it?',
    paragraphs: [
      'A ZIP-3 is the first three digits of a ZIP code (for example, "100" covers much of Manhattan). There are about 900 of them nationally. This is the geographic unit carriers and network planners commonly use for regional coverage analysis: coarse enough to model the whole country quickly, yet fine enough to distinguish major demand centers.',
      'The app loads 913 US ZIP-3 zones from a reference dataset. Each zone has a centroid derived from public ZCTA coordinates, aggregated to the ZIP-3 level. Leading zeros are preserved (for example, "006" in Puerto Rico).',
    ],
  },
  {
    question: 'What is the demand index?',
    paragraphs: [
      'Demand index is a pre-computed, unitless relative score shipped in the reference dataset. The app does not calculate it. It is a modeled proxy for distribution demand potential, not measured shipment volume, sales, or a carrier rate quote.',
      'The score combines two ACS signals at the ZIP-3 level:',
    ],
    bullets: [
      'Population scale: larger markets score higher, reflecting more households to serve.',
      'Spending capacity: zones with higher median household income receive additional weight, reflecting greater per-household purchasing power.',
    ],
  },
  {
    question: 'How should I interpret demand index totals and percentages?',
    paragraphs: [
      'Values are comparable across zones and can be summed for reachable coverage totals. On Reach & Expand, demand served % is the sum of demand index for served zones divided by total US demand index in the dataset.',
      'Demand index is not normalized to forecast order counts and should not be read as predicted shipments. Rows with missing ACS demographics have no demand index.',
    ],
  },
  {
    question: 'How are transit days and parcel zones calculated?',
    paragraphs: [
      'Transit days and parcel zones are computed client-side from zone centroids using standard ground-logistics heuristics:',
    ],
    bullets: [
      'Great-circle miles: haversine formula (Earth radius 3,958.8 mi).',
      'Road miles: great-circle × 1.17 (over-road approximation).',
      'Transit days: road miles mapped to day buckets: ≤150 mi → 1 day, ≤350 mi → 2 days, ≤600 mi → 3 days, ≤1,000 mi → 4 days, ≤1,400 mi → 5 days, ≤1,800 mi → 6 days, else 7 days.',
      'Parcel zone: road miles mapped to zones 2–8: ≤50 mi → 2, ≤150 mi → 3, ≤300 mi → 4, ≤600 mi → 5, ≤1,000 mi → 6, ≤1,400 mi → 7, else 8.',
    ],
  },
  {
    question: 'How does Reach & Expand work?',
    paragraphs: [
      'Add one or more warehouse ZIP-3 codes. Each demand zone is assigned to the nearest warehouse by transit days (shortest path across the network). A zone counts as served if any warehouse can reach it within the selected service standard (1, 2, or 3 days).',
      'Demand served % is the sum of demand index for served zones divided by total US demand index; population % uses the same union logic. The expansion planner recommends up to three additional nodes using greedy siting to maximize incremental demand, population, or zone count.',
      'The coverage map plots each zone centroid on a US Albers projection; dot size reflects population and color reflects an amber transit-day ramp. Navy markers with amber rings show recommended next sites.',
    ],
  },
  {
    question: 'What limitations should I keep in mind?',
    paragraphs: [
      'This tool is for exploratory siting and network planning, not carrier quoting or financial forecasting. Distances use straight-line approximations, not actual road networks. Transit-day buckets are modeled heuristics, not guaranteed service levels.',
      'Demand index, transit days, and parcel zones are estimates from public data, not measured demand or quoted carrier rates.',
      'Population, households, and income are US Census ACS 5-year data.',
    ],
  },
];
