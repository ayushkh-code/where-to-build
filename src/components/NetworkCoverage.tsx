import { useMemo, useState } from 'react';
import type { Zip3Zone } from '../data';
import {
  computeNetworkCoverage,
  computeNetworkDaySummaries,
  groupServedZonesByState,
} from '../networkCoverage';
import { formatDecimal, formatNumber } from '../format';
import { ZIP3_HELP } from '../labels';
import { TAB_PURPOSE } from '../tabPurpose';
import { TabPurpose } from './TabPurpose';
import { NetworkCoverageMap } from './NetworkCoverageMap';
import { TransitDayText, TransitDaysHint } from './TransitDaysHint';
import { SavedZipBar } from './SavedZipBar';

interface NetworkCoverageProps {
  zones: Zip3Zone[];
  zip3Index: Map<string, Zip3Zone>;
  totalUsPopulation: number;
  totalUsDemandIndex: number;
  savedZip3s: string[];
  onAdd: (zip3: string) => boolean;
  onRemove: (zip3: string) => void;
  addError: string | null;
  onClearError: () => void;
}

export function NetworkCoverage({
  zones,
  zip3Index,
  totalUsPopulation,
  totalUsDemandIndex,
  savedZip3s,
  onAdd,
  onRemove,
  addError,
  onClearError,
}: NetworkCoverageProps) {
  const [dayThreshold, setDayThreshold] = useState<1 | 2 | 3>(2);

  const warehouses = useMemo(
    () =>
      savedZip3s
        .map((z) => zip3Index.get(z))
        .filter((z): z is Zip3Zone => z !== undefined),
    [savedZip3s, zip3Index],
  );

  const summaries = useMemo(
    () =>
      computeNetworkDaySummaries(
        warehouses,
        zones,
        totalUsPopulation,
        totalUsDemandIndex,
      ),
    [warehouses, zones, totalUsPopulation, totalUsDemandIndex],
  );

  const networkCoverage = useMemo(
    () => computeNetworkCoverage(warehouses, zones),
    [warehouses, zones],
  );

  const activeSummary = summaries.find((s) => s.dayThreshold === dayThreshold);

  const servedByState = useMemo(() => {
    const served = networkCoverage.filter(
      (z) => z.min_transit_days <= dayThreshold,
    );
    return groupServedZonesByState(served);
  }, [networkCoverage, dayThreshold]);

  const servedCount = useMemo(
    () => servedByState.reduce((n, g) => n + g.zones.length, 0),
    [servedByState],
  );

  return (
    <section className="mode-panel">
      <TabPurpose>{TAB_PURPOSE.network}</TabPurpose>

      <SavedZipBar
        embedded
        savedZip3s={savedZip3s}
        zip3Index={zip3Index}
        onAdd={onAdd}
        onRemove={onRemove}
        addError={addError}
        onClearError={onClearError}
        inputId="network-zip-input"
        label={`Warehouse: ZIP-3 ${ZIP3_HELP} or ZIP-5`}
      />

      {warehouses.length === 0 && (
        <p className="message message--loading">
          Add a warehouse ZIP above to see network coverage.
        </p>
      )}

      <fieldset className="day-selector network-day-selector">
        <legend>
          Service standard <TransitDaysHint />
        </legend>
        {([1, 2, 3] as const).map((d) => (
          <label key={d} className="day-option">
            <input
              type="radio"
              name="networkDayThreshold"
              value={d}
              checked={dayThreshold === d}
              onChange={() => setDayThreshold(d)}
              disabled={warehouses.length === 0}
            />
            <TransitDayText days={d} hint />
          </label>
        ))}
      </fieldset>

      {activeSummary && (
        <>
          <div className="network-hero">
            <p className="network-hero__label">
              Demand served (
              <TransitDayText days={dayThreshold} hint /> ground transit)
            </p>
            <p className="network-hero__value mono">
              {activeSummary.demandIndexPct.toFixed(1)}%
            </p>
            <p className="network-hero__sub">
              of total US demand index (
              <span className="mono">
                {formatDecimal(activeSummary.totalDemandIndex, 1)}
              </span>{' '}
              of{' '}
              <span className="mono">
                {formatDecimal(totalUsDemandIndex, 1)}
              </span>
              )
            </p>
          </div>

          <div className="summary-cards">
            {summaries.map((s) => (
              <article
                key={s.dayThreshold}
                className={`summary-card ${dayThreshold === s.dayThreshold ? 'summary-card--active' : ''}`}
              >
                <h3>
                  <TransitDayText days={s.dayThreshold} hint /> network reach
                </h3>
                <p className="summary-card__stat mono summary-card__stat--sm">
                  {formatDecimal(s.totalDemandIndex, 1)} demand
                </p>
                <p className="summary-card__label">demand index served</p>
                <p className="summary-card__pct mono">
                  {s.demandIndexPct.toFixed(1)}%
                </p>
                <p className="summary-card__label">of US demand</p>
                <p className="summary-card__stat mono summary-card__stat--sm">
                  {formatNumber(s.totalPopulation)}
                </p>
                <p className="summary-card__label">
                  population ({s.populationPct.toFixed(1)}%)
                </p>
                <p className="summary-card__stat mono">
                  {formatNumber(s.zonesServed)}
                </p>
                <p className="summary-card__label">
                  ZIP-3 {ZIP3_HELP} zones
                </p>
              </article>
            ))}
          </div>
        </>
      )}

      <NetworkCoverageMap
        warehouses={warehouses}
        servedZones={networkCoverage}
        dayThreshold={dayThreshold}
      />

      {activeSummary && (
        <>
          <div className="table-controls">
            <h3 className="state-zip-table__heading">
              Served ZIP-3 {ZIP3_HELP} by state
            </h3>
            <p className="table-count mono">
              {formatNumber(servedCount)} zones in {servedByState.length} states
            </p>
          </div>

          <div className="state-zip-tables">
            {servedByState.map((group) => (
              <section key={group.state} className="state-zip-section">
                <h4 className="state-zip-section__title">
                  <span className="mono">{group.state}</span>
                  <span className="state-zip-section__count">
                    {group.zones.length} ZIP-3
                    {group.zones.length !== 1 ? 's' : ''}
                  </span>
                </h4>
                <div className="table-wrap state-zip-section__table">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ZIP-3</th>
                        <th>City</th>
                        <th>Population</th>
                        <th>Demand Index</th>
                        <th>Nearest DC</th>
                        <th>
                          Days <TransitDaysHint />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.zones.map((row) => (
                        <tr key={row.zone.zip3}>
                          <td className="mono">{row.zone.zip3}</td>
                          <td>{row.zone.primary_city}</td>
                          <td className="mono num">
                            {formatNumber(row.zone.population)}
                          </td>
                          <td className="mono num">
                            {row.zone.demand_index?.toFixed(2) ?? '-'}
                          </td>
                          <td className="mono">{row.nearest_warehouse_zip3}</td>
                          <td className="mono num">{row.min_transit_days}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
