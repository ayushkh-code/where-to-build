import { useEffect, useMemo, useState } from 'react';
import type { Zip3Zone } from '../data';
import {
  computeAllZoneMetrics,
  computeDaySummaries,
  sortReachable,
  type SortKey,
} from '../coverage';
import { formatNumber } from '../format';
import { ZIP3_HELP } from '../labels';
import { TAB_PURPOSE } from '../tabPurpose';
import { TabPurpose } from './TabPurpose';
import { UsCoverageMap } from './UsCoverageMap';
import { TransitDayText, TransitDaysHint } from './TransitDaysHint';
import { SavedZipBar } from './SavedZipBar';

interface CoverageAnalysisProps {
  zones: Zip3Zone[];
  zip3Index: Map<string, Zip3Zone>;
  totalUsPopulation: number;
  savedZip3s: string[];
  onAdd: (zip3: string) => boolean;
  onRemove: (zip3: string) => void;
  addError: string | null;
  onClearError: () => void;
}

export function CoverageAnalysis({
  zones,
  zip3Index,
  totalUsPopulation,
  savedZip3s,
  onAdd,
  onRemove,
  addError,
  onClearError,
}: CoverageAnalysisProps) {
  const [originZip3, setOriginZip3] = useState<string | null>(null);
  const [dayThreshold, setDayThreshold] = useState<1 | 2 | 3>(2);
  const [sortKey, setSortKey] = useState<SortKey>('population');

  useEffect(() => {
    if (savedZip3s.length === 0) {
      setOriginZip3(null);
      return;
    }
    if (!originZip3 || !savedZip3s.includes(originZip3)) {
      setOriginZip3(savedZip3s[savedZip3s.length - 1]);
    }
  }, [savedZip3s, originZip3]);

  const origin = originZip3 ? zip3Index.get(originZip3) ?? null : null;

  const summaries = useMemo(() => {
    if (!origin) return null;
    return computeDaySummaries(origin, zones, totalUsPopulation);
  }, [origin, zones, totalUsPopulation]);

  const allZoneMetrics = useMemo(() => {
    if (!origin) return [];
    return computeAllZoneMetrics(origin, zones);
  }, [origin, zones]);

  const tableRows = useMemo(() => {
    const reachable = allZoneMetrics.filter(
      (r) => r.transit_days <= dayThreshold,
    );
    return sortReachable(reachable, sortKey);
  }, [allZoneMetrics, dayThreshold, sortKey]);

  const toggleSort = (key: SortKey) => {
    setSortKey(key);
  };

  return (
    <section className="mode-panel">
      <TabPurpose>{TAB_PURPOSE.coverage}</TabPurpose>

      <SavedZipBar
        embedded
        savedZip3s={savedZip3s}
        zip3Index={zip3Index}
        onAdd={onAdd}
        onRemove={onRemove}
        addError={addError}
        onClearError={onClearError}
        inputId="coverage-zip-input"
        label={`Candidate warehouse: ZIP-3 ${ZIP3_HELP} or ZIP-5`}
      />

      {savedZip3s.length > 1 && (
        <fieldset className="origin-picker">
          <legend>Coverage from</legend>
          {savedZip3s.map((zip3) => {
            const zone = zip3Index.get(zip3);
            return (
              <label key={zip3} className="day-option">
                <input
                  type="radio"
                  name="coverageOrigin"
                  checked={originZip3 === zip3}
                  onChange={() => setOriginZip3(zip3)}
                />
                <span className="mono">{zip3}</span>
                {zone && (
                  <span className="origin-picker__place">
                    {zone.primary_city}, {zone.primary_state}
                  </span>
                )}
              </label>
            );
          })}
        </fieldset>
      )}

      <fieldset className="day-selector network-day-selector">
        <legend>
          Table day threshold <TransitDaysHint />
        </legend>
        {([1, 2, 3] as const).map((d) => (
          <label key={d} className="day-option">
            <input
              type="radio"
              name="dayThreshold"
              value={d}
              checked={dayThreshold === d}
              onChange={() => setDayThreshold(d)}
              disabled={!origin}
            />
            <TransitDayText days={d} hint />
          </label>
        ))}
      </fieldset>

      {origin && summaries && (
        <>
          <p className="origin-label">
            Origin: <strong>{origin.zip3}</strong>, {origin.primary_city},{' '}
            {origin.primary_state}
          </p>

          <div className="summary-cards">
            {summaries.map((s) => (
              <article key={s.dayThreshold} className="summary-card">
                <h3>
                  <TransitDayText days={s.dayThreshold} hint /> reach
                </h3>
                <p className="summary-card__stat mono">
                  {formatNumber(s.zoneCount)}
                </p>
                <p className="summary-card__label">
                  ZIP-3 {ZIP3_HELP} zones
                </p>
                <p className="summary-card__stat mono summary-card__stat--sm">
                  {formatNumber(s.totalPopulation)}
                </p>
                <p className="summary-card__label">population</p>
                <p className="summary-card__pct mono">
                  {s.populationPct.toFixed(1)}%
                </p>
                <p className="summary-card__label">of US total</p>
              </article>
            ))}
          </div>
        </>
      )}

      <UsCoverageMap
        origin={origin}
        zoneMetrics={allZoneMetrics}
        dayThreshold={dayThreshold}
      />

      {origin && summaries && (
        <>
          <div className="table-controls">
            <p className="table-count mono">
              {formatNumber(tableRows.length)} zones within{' '}
              <TransitDayText days={dayThreshold} />{' '}
            </p>
          </div>

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
                      onClick={() => toggleSort('population')}
                    >
                      Population ↓
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className={`sort-btn ${sortKey === 'demand_index' ? 'sort-btn--active' : ''}`}
                      onClick={() => toggleSort('demand_index')}
                    >
                      Demand Index ↓
                    </button>
                  </th>
                  <th>
                    Transit days <TransitDaysHint />
                  </th>
                  <th>Parcel Zone</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
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
                    <td className="mono num">{row.transit_days}</td>
                    <td className="mono num">{row.parcel_zone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {savedZip3s.length === 0 && (
        <p className="message message--loading">
          Add a candidate warehouse ZIP above to analyze coverage.
        </p>
      )}
    </section>
  );
}
