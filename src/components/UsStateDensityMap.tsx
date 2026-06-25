import { useMemo, useState } from 'react';
import type { Zip3Zone } from '../data';
import { formatNumber } from '../format';
import { TAB_PURPOSE } from '../tabPurpose';
import { TabPurpose } from './TabPurpose';
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  computeStateDensities,
  densityFillColor,
  densityLabelColor,
  densityTierRanges,
  DENSITY_TIER_COLORS,
  DENSITY_TIER_LABELS,
  type StateDensity,
} from '../stateDensity';

interface UsStateDensityMapProps {
  zones: Zip3Zone[];
}

export function UsStateDensityMap({ zones }: UsStateDensityMapProps) {
  const [hovered, setHovered] = useState<StateDensity | null>(null);

  const states = useMemo(() => computeStateDensities(zones), [zones]);
  const tierRanges = useMemo(() => densityTierRanges(states), [states]);

  const hoveredCentroid = useMemo(() => {
    if (!hovered?.labelX || hovered.labelY === null) return null;
    return { x: hovered.labelX, y: hovered.labelY };
  }, [hovered]);

  return (
    <section className="mode-panel density-panel">
      <TabPurpose>{TAB_PURPOSE.density}</TabPurpose>

      <div className="coverage-map density-map">
        <div className="coverage-map__header">
          <h3>Population density by state</h3>
          <p>Three-tier choropleth: darker blue = higher density</p>
        </div>

        <div className="coverage-map__frame">
          <svg
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            className="coverage-map__svg"
            role="img"
            aria-label="US state map colored by population density in three tiers"
          >
            <rect
              width={MAP_WIDTH}
              height={MAP_HEIGHT}
              fill="#f8fafc"
              rx={4}
            />

            <g className="density-map__states">
              {states.map((st) =>
                st.path ? (
                  <path
                    key={st.fips}
                    d={st.path}
                    fill={densityFillColor(st.tier)}
                    stroke="#fff"
                    strokeWidth={0.75}
                    className="density-map__state"
                    onMouseEnter={() => setHovered(st)}
                    onMouseLeave={() => setHovered(null)}
                  />
                ) : null,
              )}
            </g>

            <g className="density-map__labels" aria-hidden="true">
              {states.map((st) =>
                st.abbr && st.labelX !== null && st.labelY !== null ? (
                  <text
                    key={`label-${st.fips}`}
                    x={st.labelX}
                    y={st.labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="density-map__label"
                    fill={densityLabelColor(st.tier)}
                    fontSize={st.abbr.length > 2 ? 8 : 10}
                  >
                    {st.abbr}
                  </text>
                ) : null,
              )}
            </g>
          </svg>

          {hovered && hoveredCentroid && (
            <div
              className="coverage-map__tooltip"
              style={{
                left: `${(hoveredCentroid.x / MAP_WIDTH) * 100}%`,
                top: `${(hoveredCentroid.y / MAP_HEIGHT) * 100}%`,
              }}
            >
              <strong>{hovered.name}</strong>
              <span className="mono">
                {formatNumber(Math.round(hovered.density))} / sq mi
              </span>
              <span className="mono">
                Pop. {formatNumber(hovered.population)}
              </span>
              <span>
                {hovered.tier !== null
                  ? `${DENSITY_TIER_LABELS[hovered.tier]} density`
                  : 'No data'}
              </span>
            </div>
          )}

          <ul className="coverage-map__legend density-map__legend" aria-label="Density legend">
            {tierRanges.map(({ tier, label, min, max }) => (
              <li key={tier}>
                <span
                  className="coverage-map__swatch density-map__swatch"
                  style={{ background: DENSITY_TIER_COLORS[tier] }}
                />
                {label}
                <span className="mono density-map__range">
                  {Math.round(min)}–{Math.round(max)}/mi²
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
