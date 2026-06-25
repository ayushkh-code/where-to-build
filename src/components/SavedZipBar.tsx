import { useState } from 'react';
import { toZip3, type Zip3Zone } from '../data';
import { ZIP3_HELP } from '../labels';

interface SavedZipBarProps {
  savedZip3s: string[];
  zip3Index: Map<string, Zip3Zone>;
  onAdd: (zip3: string) => boolean;
  onRemove: (zip3: string) => void;
  addError: string | null;
  onClearError: () => void;
  inputId?: string;
  /** Render inside a tab panel without a second card chrome. */
  embedded?: boolean;
  /** Show removable chip list below the input (off on ZIP-3 Lookup; cards list locations). */
  showChips?: boolean;
  label?: string;
  emptyHint?: string | null;
}

export function SavedZipChips({
  savedZip3s,
  zip3Index,
  onRemove,
}: {
  savedZip3s: string[];
  zip3Index: Map<string, Zip3Zone>;
  onRemove: (zip3: string) => void;
}) {
  if (savedZip3s.length === 0) return null;
  return (
    <ul className="warehouse-list">
      {savedZip3s.map((zip3) => {
        const zone = zip3Index.get(zip3);
        return (
          <li key={zip3} className="warehouse-chip">
            <span className="mono warehouse-chip__zip">{zip3}</span>
            {zone && (
              <span className="warehouse-chip__place">
                {zone.primary_city}, {zone.primary_state}
              </span>
            )}
            <button
              type="button"
              className="warehouse-chip__remove"
              onClick={() => onRemove(zip3)}
              aria-label={`Remove ${zip3}`}
            >
              ×
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function SavedZipBar({
  savedZip3s,
  zip3Index,
  onAdd,
  onRemove,
  addError,
  onClearError,
  inputId = 'saved-zip-input',
  embedded = false,
  showChips = true,
  label,
  emptyHint = 'Add a location here. It stays saved as you switch tabs.',
}: SavedZipBarProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onClearError();
    const zip3 = toZip3(input);
    if (onAdd(zip3)) {
      setInput('');
    }
  };

  const resolvedLabel =
    label ?? `ZIP-3 ${ZIP3_HELP} or full ZIP-5`;

  return (
    <div
      className={
        embedded ? 'saved-zip-bar saved-zip-bar--embedded' : 'saved-zip-bar'
      }
    >
      <form className="saved-zip-bar__form" onSubmit={handleSubmit}>
        <label htmlFor={inputId}>{resolvedLabel}</label>
        <div className="search-row">
          <input
            id={inputId}
            type="text"
            inputMode="numeric"
            placeholder="e.g. 100 or 10001"
            maxLength={5}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoComplete="off"
          />
          <button type="submit">Add</button>
        </div>
      </form>

      {addError && <p className="message message--warn">{addError}</p>}

      {showChips &&
        (savedZip3s.length > 0 ? (
          <SavedZipChips
            savedZip3s={savedZip3s}
            zip3Index={zip3Index}
            onRemove={onRemove}
          />
        ) : (
          emptyHint != null && (
            <p className="saved-zip-bar__empty">{emptyHint}</p>
          )
        ))}
    </div>
  );
}
