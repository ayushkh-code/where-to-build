import { CreatorCredit } from './CreatorCredit';
import { VisitorCount } from './VisitorCount';

interface AppHeroProps {
  totalPopulation: number;
  zoneCount: number;
  statsReady?: boolean;
}

function formatCompactPeople(n: number): string {
  if (n >= 1_000_000) {
    return `${Math.round(n / 1_000_000)}M people`;
  }
  return `${n.toLocaleString('en-US')} people`;
}

export function AppHero({
  totalPopulation,
  zoneCount,
  statsReady = true,
}: AppHeroProps) {
  return (
    <div className="app-hero">
      <div className="app-hero__inner">
        <div className="app-hero__top">
          <div className="app-hero__brand">
            <h1 className="app-hero__title">Footprint</h1>
            <VisitorCount />
          </div>
          <CreatorCredit />
        </div>
        <p className="app-hero__subhead">
          Find where to place your next distribution center. See what population
          your current fulfillment network reaches today, then get data-backed
          recommendations for where to expand using real US Census demand data.
        </p>
        {statsReady && (
          <dl className="app-hero__stats">
          <div className="app-hero__stat">
            <dt className="app-hero__stat-value mono">
              {formatCompactPeople(totalPopulation)}
            </dt>
            <dd className="app-hero__stat-label">in dataset</dd>
          </div>
          <div className="app-hero__stat">
            <dt className="app-hero__stat-value mono">{zoneCount}</dt>
            <dd className="app-hero__stat-label">US regions</dd>
          </div>
          <div className="app-hero__stat">
            <dt className="app-hero__stat-value">Census-backed</dt>
            <dd className="app-hero__stat-label">demand data</dd>
          </div>
        </dl>
        )}
      </div>
    </div>
  );
}
