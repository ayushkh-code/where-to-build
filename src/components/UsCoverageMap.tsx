import { useMemo, useState } from 'react';
import type { Zip3Zone } from '../data';
import type { ReachableZone } from '../coverage';
import { formatNumber } from '../format';
import { TransitDayText } from './TransitDaysHint';
import {
  DAY_COLORS,
  MAP_HEIGHT,
  MAP_WIDTH,
  dotRadius,
  projectPoint,
  statePaths,
  zoneFillColor,
  zoneOpacity,
} from '../map';

interface UsCoverageMapProps {
  origin: Zip3Zone | null;
  zoneMetrics: ReachableZone[];
  dayThreshold: 1 | 2 | 3;
}

interface HoveredZone {
  zip3: string;
  label: string;
  transit_days: number;
  population: number | null;
  x: number;
  y: number;
}

export function UsCoverageMap({
  origin,
  zoneMetrics,
  dayThreshold,
}: UsCoverageMapProps) {
  const [hovered, setHovered] = useState<HoveredZone | null>(null);

  const plotted = useMemo(() => {
    return zoneMetrics
      .map((row) => {
        const coords = projectPoint(
          row.zone.centroid_lat,
          row.zone.centroid_lng,
        );
        if (!coords) return null;
        const isOrigin = origin?.zip3 === row.zone.zip3;
        const within = row.transit_days <= dayThreshold;
        return {
          row,
          x: coords[0],
          y: coords[1],
          isOrigin,
          within,
          r: dotRadius(row.zone.population, isOrigin),
          fill: zoneFillColor(row.transit_days, within, isOrigin),
          opacity: zoneOpacity(row.transit_days, dayThreshold, isOrigin),
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .sort((a, b) => a.r - b.r);
  }, [zoneMetrics, origin, dayThreshold]);

  return (
    <div className="coverage-map">
      <div className="coverage-map__header">
        <h3>Coverage map</h3>
        <p>
          {origin
            ? `Reach from ${origin.zip3} (${origin.primary_city}, ${origin.primary_state}): zones within `
            : 'US reference map: add locations to overlay coverage'}
          {origin && (
            <>
              <TransitDayText days={dayThreshold} hint />
            </>
          )}
          {origin && ' highlighted'}
        </p>
      </div>

      <div className="coverage-map__frame">
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="coverage-map__svg"
          role="img"
          aria-label={
            origin
              ? `US map showing ${dayThreshold}-day coverage from ZIP-3 ${origin.zip3}`
              : 'US map awaiting coverage analysis'
          }
        >
          <rect
            width={MAP_WIDTH}
            height={MAP_HEIGHT}
            fill="#f8fafc"
            rx={4}
          />

          <g className="coverage-map__states">
            {statePaths.map((s) =>
              s.d ? (
                <path
                  key={s.id}
                  d={s.d}
                  fill="#eef1f5"
                  stroke="#c5cdd8"
                  strokeWidth={0.6}
                />
              ) : null,
            )}
          </g>

          {plotted.map(({ row, x, y, r, fill, opacity, isOrigin }) => (
            <circle
              key={row.zone.zip3}
              cx={x}
              cy={y}
              r={r}
              fill={fill}
              fillOpacity={opacity}
              stroke={isOrigin ? '#fff' : 'none'}
              strokeWidth={isOrigin ? 2 : 0}
              className="coverage-map__dot"
              onMouseEnter={() =>
                setHovered({
                  zip3: row.zone.zip3,
                  label: `${row.zone.primary_city}, ${row.zone.primary_state}`,
                  transit_days: row.transit_days,
                  population: row.zone.population,
                  x,
                  y,
                })
              }
              onMouseLeave={() => setHovered(null)}
            />
          ))}

          {!origin && (
            <text
              x={MAP_WIDTH / 2}
              y={MAP_HEIGHT / 2}
              textAnchor="middle"
              className="coverage-map__placeholder"
            >
              Enter an origin ZIP-3 and click Analyze
            </text>
          )}
        </svg>

        {hovered && (
          <div
            className="coverage-map__tooltip"
            style={{
              left: `${(hovered.x / MAP_WIDTH) * 100}%`,
              top: `${(hovered.y / MAP_HEIGHT) * 100}%`,
            }}
          >
            <strong className="mono">{hovered.zip3}</strong>
            <span>{hovered.label}</span>
            <span className="mono">
              {hovered.transit_days} transit day
              {hovered.transit_days > 1 ? 's' : ''}
            </span>
            <span className="mono">
              Pop. {formatNumber(hovered.population)}
            </span>
          </div>
        )}

        {origin && (
          <ul className="coverage-map__legend" aria-label="Map legend">
            <li>
              <span
                className="coverage-map__swatch"
                style={{ background: DAY_COLORS[1] }}
              />
              <TransitDayText days={1} hint />
            </li>
            <li>
              <span
                className="coverage-map__swatch"
                style={{ background: DAY_COLORS[2] }}
              />
              <TransitDayText days={2} hint />
            </li>
            <li>
              <span
                className="coverage-map__swatch"
                style={{ background: DAY_COLORS[3] }}
              />
              <TransitDayText days={3} hint />
            </li>
            <li>
              <span
                className="coverage-map__swatch coverage-map__swatch--muted"
              />
              Beyond <TransitDayText days={dayThreshold} />
            </li>
            <li>
              <span
                className="coverage-map__swatch coverage-map__swatch--origin"
              />
              Origin
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
