import { useMemo } from 'react';
import type { Zip3Zone } from '../data';
import { formatCurrency, formatDecimal, formatNumber } from '../format';
import { TAB_PURPOSE } from '../tabPurpose';
import { TabPurpose } from './TabPurpose';
import { SavedZipBar } from './SavedZipBar';
import { ZIP3_HELP } from '../labels';

interface Zip3LookupProps {
  savedZip3s: string[];
  zip3Index: Map<string, Zip3Zone>;
  onAdd: (zip3: string) => boolean;
  onRemove: (zip3: string) => void;
  addError: string | null;
  onClearError: () => void;
}

function ZoneCard({
  zone,
  onRemove,
}: {
  zone: Zip3Zone;
  onRemove: (zip3: string) => void;
}) {
  return (
    <article className="detail-card">
      <header className="detail-card__header">
        <div className="detail-card__title">
          <span className="detail-card__zip">{zone.zip3}</span>
          <span className="detail-card__place">
            {zone.primary_city}, {zone.primary_state}
          </span>
        </div>
        <button
          type="button"
          className="detail-card__remove"
          onClick={() => onRemove(zone.zip3)}
          aria-label={`Remove ${zone.zip3}`}
        >
          Remove
        </button>
      </header>
      <dl className="detail-grid">
        <div>
          <dt>Population</dt>
          <dd className="mono">{formatNumber(zone.population)}</dd>
        </div>
        <div>
          <dt>Households</dt>
          <dd className="mono">{formatNumber(zone.households)}</dd>
        </div>
        <div>
          <dt>Median HH Income</dt>
          <dd className="mono">{formatCurrency(zone.median_hh_income)}</dd>
        </div>
        <div>
          <dt>Demand Index</dt>
          <dd className="mono">{formatDecimal(zone.demand_index)}</dd>
        </div>
        <div>
          <dt>ZIP-5 Count</dt>
          <dd className="mono">{formatNumber(zone.zip5_count)}</dd>
        </div>
      </dl>
    </article>
  );
}

export function Zip3Lookup({
  savedZip3s,
  zip3Index,
  onAdd,
  onRemove,
  addError,
  onClearError,
}: Zip3LookupProps) {
  const entries = useMemo(
    () =>
      savedZip3s
        .map((z) => zip3Index.get(z))
        .filter((z): z is Zip3Zone => z !== undefined),
    [savedZip3s, zip3Index],
  );

  const totals = useMemo(
    () => ({
      population: entries.reduce((s, z) => s + (z.population ?? 0), 0),
      households: entries.reduce((s, z) => s + (z.households ?? 0), 0),
      demand_index: entries.reduce((s, z) => s + (z.demand_index ?? 0), 0),
      zip5_count: entries.reduce((s, z) => s + z.zip5_count, 0),
    }),
    [entries],
  );

  return (
    <section className="mode-panel">
      <TabPurpose>{TAB_PURPOSE.lookup}</TabPurpose>

      <SavedZipBar
        embedded
        savedZip3s={savedZip3s}
        zip3Index={zip3Index}
        onAdd={onAdd}
        onRemove={onRemove}
        addError={addError}
        onClearError={onClearError}
        inputId="lookup-zip-input"
        label={`Location: ZIP-3 ${ZIP3_HELP} or ZIP-5`}
        showChips={false}
        emptyHint={null}
      />

      {entries.length === 0 && (
        <p className="message message--loading">
          Add a ZIP above to see zone data.
        </p>
      )}

      {entries.length > 0 && (
        <div className="lookup-list">
          {entries.map((zone) => (
            <ZoneCard key={zone.zip3} zone={zone} onRemove={onRemove} />
          ))}

          {entries.length > 1 && (
            <article className="detail-card detail-card--total">
              <header className="detail-card__header">
                <span className="detail-card__zip">Total</span>
                <span className="detail-card__place">
                  {entries.length} zones
                </span>
              </header>
              <dl className="detail-grid">
                <div>
                  <dt>Population</dt>
                  <dd className="mono">{formatNumber(totals.population)}</dd>
                </div>
                <div>
                  <dt>Households</dt>
                  <dd className="mono">{formatNumber(totals.households)}</dd>
                </div>
                <div>
                  <dt>Median HH Income</dt>
                  <dd className="mono">-</dd>
                </div>
                <div>
                  <dt>Demand Index</dt>
                  <dd className="mono">
                    {formatDecimal(totals.demand_index)}
                  </dd>
                </div>
                <div>
                  <dt>ZIP-5 Count</dt>
                  <dd className="mono">{formatNumber(totals.zip5_count)}</dd>
                </div>
              </dl>
            </article>
          )}
        </div>
      )}
    </section>
  );
}
