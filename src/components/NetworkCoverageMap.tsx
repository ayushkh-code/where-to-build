import { useMemo, useState } from 'react';
import type { Zip3Zone } from '../data';
import type { ServedZone } from '../networkCoverage';
import { formatNumber } from '../format';
import { EMPTY_WAREHOUSE_PROMPT } from '../labels';
import { TransitDayText } from './TransitDaysHint';
import {
  DAY_COLORS,
  MAP_HEIGHT,
  MAP_WIDTH,
  dotRadius,
  getStateMapLabels,
  projectPoint,
  statePaths,
  zoneFillColor,
  zoneOpacity,
} from '../map';

const stateLabels = getStateMapLabels();

interface NetworkCoverageMapProps {
  warehouses: Zip3Zone[];
  recommendedNodes?: Zip3Zone[];
  servedZones: ServedZone[];
  dayThreshold: 1 | 2 | 3;
  /** Tighter layout for Reach & Expand (title only, minimal frame padding). */
  compact?: boolean;
}

interface HoveredZone {
  zip3: string;
  label: string;
  transit_days: number;
  warehouse: string;
  population: number | null;
  x: number;
  y: number;
}

export function NetworkCoverageMap({
  warehouses,
  recommendedNodes = [],
  servedZones,
  dayThreshold,
  compact = false,
}: NetworkCoverageMapProps) {
  const [hovered, setHovered] = useState<HoveredZone | null>(null);
  const warehouseZip3s = useMemo(
    () => new Set(warehouses.map((w) => w.zip3)),
    [warehouses],
  );

  const plotted = useMemo(() => {
    return servedZones
      .map((row) => {
        const coords = projectPoint(
          row.zone.centroid_lat,
          row.zone.centroid_lng,
        );
        if (!coords) return null;
        const isWarehouse = warehouseZip3s.has(row.zone.zip3);
        const within = row.min_transit_days <= dayThreshold;
        return {
          row,
          x: coords[0],
          y: coords[1],
          isWarehouse,
          within,
          r: dotRadius(row.zone.population, isWarehouse),
          fill: zoneFillColor(row.min_transit_days, within, isWarehouse),
          opacity: zoneOpacity(row.min_transit_days, dayThreshold, isWarehouse),
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .sort((a, b) => a.r - b.r);
  }, [servedZones, warehouseZip3s, dayThreshold]);

  const recommendedMarkers = useMemo(() => {
    return recommendedNodes
      .map((zone, i) => {
        const coords = projectPoint(zone.centroid_lat, zone.centroid_lng);
        if (!coords || warehouseZip3s.has(zone.zip3)) return null;
        return {
          zone,
          rank: i + 1,
          x: coords[0],
          y: coords[1],
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);
  }, [recommendedNodes, warehouseZip3s]);

  return (
    <div className={compact ? 'coverage-map coverage-map--reach' : 'coverage-map'}>
      {compact ? (
        <div className="coverage-map__header coverage-map__header--compact">
          <h3>Coverage Map</h3>
        </div>
      ) : (
        <div className="coverage-map__header">
          <h3>Network coverage map</h3>
          <p>
            {warehouses.length > 0
              ? `${warehouses.length} warehouse${warehouses.length > 1 ? 's' : ''}: demand served within `
              : EMPTY_WAREHOUSE_PROMPT}
            {warehouses.length > 0 && (
              <>
                <TransitDayText days={dayThreshold} />
                {' highlighted'}
              </>
            )}
          </p>
        </div>
      )}

      <div className="coverage-map__frame">
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="coverage-map__svg"
          preserveAspectRatio={compact ? 'xMidYMax meet' : undefined}
          role="img"
          aria-label={
            compact
              ? `US network coverage map at ${dayThreshold}-day ship speed`
              : 'US map showing multi-warehouse network coverage'
          }
        >
          <defs>
            <filter
              id="coverage-glow"
              x="-80%"
              y="-80%"
              width="260%"
              height="260%"
            >
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="#F8F7F5" rx={4} />

          <g className="coverage-map__states">
            {statePaths.map((s) =>
              s.d ? (
                <path
                  key={s.id}
                  d={s.d}
                  fill="#EFEDE8"
                  stroke="#E3E0DB"
                  strokeWidth={0.6}
                />
              ) : null,
            )}
          </g>

          {plotted.map(({ row, x, y, r, fill, opacity, isWarehouse, within }) => (
            <circle
              key={row.zone.zip3}
              cx={x}
              cy={y}
              r={r}
              fill={fill}
              fillOpacity={opacity}
              stroke={isWarehouse ? '#0F2438' : 'none'}
              strokeWidth={isWarehouse ? 2 : 0}
              filter={within && !isWarehouse ? 'url(#coverage-glow)' : undefined}
              className={`coverage-map__dot${within ? ' coverage-map__dot--within' : ''}`}
              onMouseEnter={() =>
                setHovered({
                  zip3: row.zone.zip3,
                  label: `${row.zone.primary_city}, ${row.zone.primary_state}`,
                  transit_days: row.min_transit_days,
                  warehouse: row.nearest_warehouse_zip3,
                  population: row.zone.population,
                  x,
                  y,
                })
              }
              onMouseLeave={() => setHovered(null)}
            />
          ))}

          {recommendedMarkers.map(({ zone, rank, x, y }) => (
            <g
              key={`rec-${zone.zip3}`}
              className="coverage-map__recommended"
              transform={`translate(${x}, ${y})`}
              aria-label={`Recommended node ${rank}: ${zone.zip3}`}
            >
              <circle
                className="coverage-map__recommended-halo"
                r={10}
                fill="none"
                stroke="#16a34a"
                strokeWidth={2}
              />
              <circle
                className="coverage-map__recommended-dot"
                r={5}
                fill="#16a34a"
                stroke="#fff"
                strokeWidth={1.5}
              />
              <text
                y={18}
                textAnchor="middle"
                className="coverage-map__recommended-label mono"
              >
                #{rank} {zone.zip3}
              </text>
            </g>
          ))}

          <g className="density-map__labels" aria-hidden="true">
            {stateLabels.map((st) => (
              <text
                key={`label-${st.fips}`}
                x={st.x}
                y={st.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="density-map__label network-map__state-label"
                fill="#374151"
                fontSize={st.abbr.length > 2 ? 8 : 10}
              >
                {st.abbr}
              </text>
            ))}
          </g>
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
              {hovered.transit_days} day{hovered.transit_days > 1 ? 's' : ''}{' '}
              from {hovered.warehouse}
            </span>
            <span className="mono">Pop. {formatNumber(hovered.population)}</span>
          </div>
        )}
      </div>

      {warehouses.length > 0 && (
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
            <span className="coverage-map__swatch coverage-map__swatch--muted" />
            Not served
          </li>
          <li>
            <span className="coverage-map__swatch coverage-map__swatch--origin" />
            Existing warehouse
          </li>
          {recommendedMarkers.length > 0 && (
            <li>
              <span className="coverage-map__swatch coverage-map__swatch--recommended" />
              Recommended node
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
