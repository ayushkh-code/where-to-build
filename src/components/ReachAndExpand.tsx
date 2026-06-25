import { useEffect, useMemo, useState } from 'react';
import type { Zip3Zone } from '../data';
import {
  computeNetworkCoverage,
  computeNetworkDaySummaries,
  groupServedZonesByState,
  RECOMMENDATION_ALTERNATIVE_COUNT,
  recommendNextSiteAlternatives,
  sortServedZones,
  type MaximizeObjective,
  type NetworkSortKey,
} from '../networkCoverage';
import { formatDecimal, formatNumber } from '../format';
import {
  EMPTY_WAREHOUSE_PROMPT,
  ZIP3_HELP,
} from '../labels';
import { HowItWorks } from './HowItWorks';
import { DayThresholdToggle } from './DayThresholdToggle';
import { NetworkCoverageMap } from './NetworkCoverageMap';
import { ShipSpeedHint, TransitDayText, TransitDaysHint } from './TransitDaysHint';
import { SavedZipBar } from './SavedZipBar';

type TableView = 'all' | 'state';

interface ReachAndExpandProps {
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

export function ReachAndExpand({
  zones,
  zip3Index,
  totalUsPopulation,
  totalUsDemandIndex,
  savedZip3s,
  onAdd,
  onRemove,
  addError,
  onClearError,
}: ReachAndExpandProps) {
  const [dayThreshold, setDayThreshold] = useState<1 | 2 | 3>(1);
  const [maximizeFor, setMaximizeFor] =
    useState<MaximizeObjective>('demand_index');
  const [tableView, setTableView] = useState<TableView>('all');
  const [sortKey, setSortKey] = useState<NetworkSortKey>('population');
  const [blacklistedZip3s, setBlacklistedZip3s] = useState<string[]>([]);
  const [showAllAlternatives, setShowAllAlternatives] = useState(false);

  const toggleBlacklist = (zip3: string) => {
    setBlacklistedZip3s((prev) =>
      prev.includes(zip3) ? prev.filter((z) => z !== zip3) : [...prev, zip3],
    );
  };

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

  const servedRows = useMemo(
    () =>
      networkCoverage.filter((z) => z.min_transit_days <= dayThreshold),
    [networkCoverage, dayThreshold],
  );

  const servedByState = useMemo(
    () => groupServedZonesByState(servedRows),
    [servedRows],
  );

  const sortedAllRows = useMemo(
    () => sortServedZones(servedRows, sortKey),
    [servedRows, sortKey],
  );

  const alternatives = useMemo(
    () =>
      recommendNextSiteAlternatives(
        warehouses,
        zones,
        RECOMMENDATION_ALTERNATIVE_COUNT,
        dayThreshold,
        maximizeFor,
        totalUsPopulation,
        totalUsDemandIndex,
        blacklistedZip3s,
      ),
    [
      warehouses,
      zones,
      dayThreshold,
      maximizeFor,
      totalUsPopulation,
      totalUsDemandIndex,
      blacklistedZip3s,
    ],
  );

  useEffect(() => {
    setShowAllAlternatives(false);
  }, [dayThreshold, maximizeFor, blacklistedZip3s, savedZip3s]);

  const visibleAlternatives = showAllAlternatives
    ? alternatives
    : alternatives.slice(0, 1);
  const moreAlternativeCount = Math.max(0, alternatives.length - 1);

  const recommendedZones = useMemo(
    () => visibleAlternatives.map((r) => r.zone),
    [visibleAlternatives],
  );

  const gainLabel =
    maximizeFor === 'demand_index'
      ? 'demand index'
      : maximizeFor === 'population'
        ? 'population'
        : 'ZIP-3 zones';

  return (
    <section className="mode-panel reach-panel">
      <HowItWorks />

      <SavedZipBar
        embedded
        savedZip3s={savedZip3s}
        zip3Index={zip3Index}
        onAdd={onAdd}
        onRemove={onRemove}
        addError={addError}
        onClearError={onClearError}
        inputId="reach-zip-input"
        label="Add current warehouse location ZIP3s"
        emptyHint={null}
        examplePlaceholder="100, 900, 606"
      />

      <div className="ship-speed-row network-day-selector">
        <span id="reach-ship-speed-label" className="day-selector__label">
          Ship speed:
          <ShipSpeedHint />
        </span>
        <DayThresholdToggle
          value={dayThreshold}
          onChange={setDayThreshold}
          disabled={warehouses.length === 0}
        />
      </div>

      {warehouses.length > 0 && activeSummary && (
        <>
          <p className="origin-label">
            {warehouses.length === 1 ? (
              <>
                Selected Zips: <strong>{warehouses[0].zip3}</strong>
                {' · '}
                {warehouses[0].primary_city}, {warehouses[0].primary_state}
              </>
            ) : (
              <>
                Selected Zips:{' '}
                <strong>{warehouses.map((w) => w.zip3).join(', ')}</strong>
              </>
            )}
          </p>

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

          <div className="summary-cards summary-cards--single">
            <article className="summary-card summary-card--active">
              <h3>
                <TransitDayText days={activeSummary.dayThreshold} hint /> reach
              </h3>
              <p className="summary-card__stat mono summary-card__stat--sm">
                {formatDecimal(activeSummary.totalDemandIndex, 1)} demand
              </p>
              <p className="summary-card__label">demand index served</p>
              <p className="summary-card__pct mono">
                {activeSummary.demandIndexPct.toFixed(1)}%
              </p>
              <p className="summary-card__label">of US demand</p>
              <p className="summary-card__stat mono summary-card__stat--sm">
                {formatNumber(activeSummary.totalPopulation)}
              </p>
              <p className="summary-card__label">
                population ({activeSummary.populationPct.toFixed(1)}%)
              </p>
              <p className="summary-card__stat mono">
                {formatNumber(activeSummary.zonesServed)}
              </p>
              <p className="summary-card__label">
                ZIP-3 {ZIP3_HELP} zones
              </p>
            </article>
          </div>
        </>
      )}

      <NetworkCoverageMap
        compact
        warehouses={warehouses}
        recommendedNodes={recommendedZones}
        servedZones={networkCoverage}
        dayThreshold={dayThreshold}
      />

      <section className="reach-panel-section reach-panel-section--planner">
        <h3 className="reach-panel-section__title">
          Where should I launch a node next?
        </h3>

        <div className="expansion-planner">
          <fieldset className="expansion-planner__objective">
            <legend>Maximize for</legend>
            <label className="day-option">
              <input
                type="radio"
                name="maximizeFor"
                value="demand_index"
                checked={maximizeFor === 'demand_index'}
                onChange={() => setMaximizeFor('demand_index')}
                disabled={warehouses.length === 0}
              />
              Demand index
            </label>
            <label className="day-option">
              <input
                type="radio"
                name="maximizeFor"
                value="population"
                checked={maximizeFor === 'population'}
                onChange={() => setMaximizeFor('population')}
                disabled={warehouses.length === 0}
              />
              Population
            </label>
            <label className="day-option">
              <input
                type="radio"
                name="maximizeFor"
                value="zones"
                checked={maximizeFor === 'zones'}
                onChange={() => setMaximizeFor('zones')}
                disabled={warehouses.length === 0}
              />
              ZIP-3 zones served
            </label>
          </fieldset>
        </div>

        {warehouses.length === 0 ? (
          <p className="saved-zip-bar__note">{EMPTY_WAREHOUSE_PROMPT}</p>
        ) : (
          <section className="node-recommendations" aria-live="polite">
            <div className="node-recommendations__header">
              <h4 className="node-recommendations__heading">
                Top site alternatives
              </h4>
              <div className="ship-speed-row ship-speed-row--inline">
                <span className="day-selector__label">Ship speed:</span>
                <DayThresholdToggle
                  id="reach-recommendations-ship-speed"
                  value={dayThreshold}
                  onChange={setDayThreshold}
                  ariaLabel="Ship speed for site alternatives"
                />
              </div>
            </div>
            <p className="node-recommendations__note">
              Five ranked options at{' '}
              <span className="mono">{dayThreshold}d</span> ship speed if your
              first choice is ineligible. Excluding a site refreshes the list.
            </p>
            {blacklistedZip3s.length > 0 && (
              <ul className="recommendation-blacklist">
                {blacklistedZip3s.map((zip3) => {
                  const zone = zip3Index.get(zip3);
                  return (
                    <li key={zip3} className="recommendation-blacklist__chip">
                      <span className="mono">{zip3}</span>
                      {zone && (
                        <span className="recommendation-blacklist__place">
                          {zone.primary_city}, {zone.primary_state}
                        </span>
                      )}
                      <button
                        type="button"
                        className="recommendation-blacklist__remove"
                        onClick={() => toggleBlacklist(zip3)}
                      >
                        Restore
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {alternatives.length === 0 ? (
              <p className="message message--loading">
                No additional warehouses improve {gainLabel} at{' '}
                <span className="mono">{dayThreshold}d</span> ship speed.
              </p>
            ) : (
              <>
                <ol className="node-recommendations__list">
                  {visibleAlternatives.map((rec) => (
                    <li key={rec.zone.zip3} className="node-recommendation-card">
                      <p className="node-recommendation-card__rank mono">
                        #{rec.rank}
                      </p>
                      <div className="node-recommendation-card__body">
                        <p className="node-recommendation-card__place">
                          <span className="mono">{rec.zone.zip3}</span>
                          {' · '}
                          {rec.zone.primary_city}, {rec.zone.primary_state}
                        </p>
                        <p className="node-recommendation-card__gain">
                          Adds{' '}
                          <span className="mono">
                            {maximizeFor === 'zones'
                              ? formatNumber(rec.incrementalGain)
                              : maximizeFor === 'population'
                                ? formatNumber(rec.incrementalGain)
                                : formatDecimal(rec.incrementalGain, 1)}
                          </span>{' '}
                          {gainLabel}
                        </p>
                        <p className="node-recommendation-card__projected">
                          Projected network at{' '}
                          <span className="mono">{dayThreshold}d</span> ship
                          speed:{' '}
                          <span className="mono">
                            {rec.demandIndexPct.toFixed(1)}%
                          </span>{' '}
                          US demand ·{' '}
                          <span className="mono">
                            {rec.populationPct.toFixed(1)}%
                          </span>{' '}
                          US population ·{' '}
                          <span className="mono">
                            {formatNumber(rec.zonesServed)}
                          </span>{' '}
                          ZIP-3 zones
                        </p>
                        <button
                          type="button"
                          className="recommendation-exclude-btn"
                          onClick={() => toggleBlacklist(rec.zone.zip3)}
                        >
                          Exclude from recommendations
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
                {!showAllAlternatives && moreAlternativeCount > 0 && (
                  <button
                    type="button"
                    className="recommendation-more-btn"
                    onClick={() => setShowAllAlternatives(true)}
                  >
                    See more alternatives..
                  </button>
                )}
              </>
            )}
          </section>
        )}
      </section>

      {warehouses.length > 0 && activeSummary && (
        <section className="reach-panel-section">
          <div className="table-controls">
            <h3 className="state-zip-table__heading">Served zones</h3>
            <fieldset className="table-view-toggle">
              <legend className="sr-only">Table layout</legend>
              <label className="day-option">
                <input
                  type="radio"
                  name="tableView"
                  checked={tableView === 'all'}
                  onChange={() => setTableView('all')}
                />
                All zones
              </label>
              <label className="day-option">
                <input
                  type="radio"
                  name="tableView"
                  checked={tableView === 'state'}
                  onChange={() => setTableView('state')}
                />
                By state
              </label>
            </fieldset>
            <p className="table-count mono">
              {formatNumber(servedRows.length)} zones in {servedByState.length}{' '}
              states
            </p>
          </div>

          {tableView === 'all' ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ZIP-3</th>
                    <th>City / State</th>
                    <th>
                      <button
                        type="button"
                        className={`sort-btn ${sortKey === 'population' ? 'sort-btn--active' : ''}`}
                        onClick={() => setSortKey('population')}
                      >
                        Population ↓
                      </button>
                    </th>
                    <th>
                      <button
                        type="button"
                        className={`sort-btn ${sortKey === 'demand_index' ? 'sort-btn--active' : ''}`}
                        onClick={() => setSortKey('demand_index')}
                      >
                        Demand Index ↓
                      </button>
                    </th>
                    <th>Nearest DC</th>
                    <th>
                      Days <TransitDaysHint />
                    </th>
                    <th>Parcel Zone</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAllRows.map((row) => (
                    <tr key={row.zone.zip3}>
                      <td className="mono">{row.zone.zip3}</td>
                      <td>
                        {row.zone.primary_city}, {row.zone.primary_state}
                      </td>
                      <td className="mono num">
                        {formatNumber(row.zone.population)}
                      </td>
                      <td className="mono num">
                        {row.zone.demand_index?.toFixed(2) ?? '-'}
                      </td>
                      <td className="mono">{row.nearest_warehouse_zip3}</td>
                      <td className="mono num">{row.min_transit_days}</td>
                      <td className="mono num">{row.parcel_zone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
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
          )}
        </section>
      )}
    </section>
  );
}
