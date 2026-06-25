import { useMemo, useState } from 'react';
import type { Zip3Zone } from '../data';
import type { ServedZone } from '../networkCoverage';
import { formatNumber } from '../format';
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
  servedZones: ServedZone[];
  dayThreshold: 1 | 2 | 3;
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
  servedZones,
  dayThreshold,
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

  return (
    <div className="coverage-map">
      <div className="coverage-map__header">
        <h3>Network coverage map</h3>
        <p>
          {warehouses.length > 0
            ? `${warehouses.length} warehouse${warehouses.length > 1 ? 's' : ''}: demand served within `
            : 'US reference map: add warehouses to overlay coverage'}
          {warehouses.length > 0 && (
            <>
              <TransitDayText days={dayThreshold} hint />
              {' highlighted'}
            </>
          )}
        </p>
      </div>

      <div className="coverage-map__frame">
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="coverage-map__svg"
          role="img"
          aria-label="US map showing multi-warehouse network coverage"
        >
          <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="#f8fafc" rx={4} />

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

          {plotted.map(({ row, x, y, r, fill, opacity, isWarehouse }) => (
            <circle
              key={row.zone.zip3}
              cx={x}
              cy={y}
              r={r}
              fill={fill}
              fillOpacity={opacity}
              stroke={isWarehouse ? '#fff' : 'none'}
              strokeWidth={isWarehouse ? 2 : 0}
              className="coverage-map__dot"
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
              <span
                className="coverage-map__swatch coverage-map__swatch--muted"
              />
              Not served
            </li>
            <li>
              <span
                className="coverage-map__swatch coverage-map__swatch--origin"
              />
              Warehouse
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
