import { useEffect, useState } from 'react';
import { toZip3, type Zip3Zone } from '../data';
import { useTypingPlaceholder } from '../useTypingPlaceholder';
import { parseZipInputSegments } from '../zipInput';
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
  /** Short note shown under the input (e.g. comma-separated entry). */
  inputNote?: string | null;
  /** Example typed in the input when empty (grey text, amber border on field). */
  examplePlaceholder?: string | null;
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
  inputNote = null,
  examplePlaceholder = null,
}: SavedZipBarProps) {
  const [input, setInput] = useState('');
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const showPrompt = Boolean(examplePlaceholder) && !input;
  const showTyping = showPrompt && !reduceMotion;
  const typedExample = useTypingPlaceholder(
    examplePlaceholder ?? '',
    showTyping,
  );
  const promptText = reduceMotion ? (examplePlaceholder ?? '') : typedExample;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onClearError();
    const segments = parseZipInputSegments(input);
    if (segments.length === 0) return;

    let addedAny = false;
    for (const segment of segments) {
      if (onAdd(toZip3(segment))) {
        addedAny = true;
      }
    }

    if (addedAny) {
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
          <div
            className={
              showPrompt
                ? 'search-row__input-wrap search-row__input-wrap--prompt'
                : 'search-row__input-wrap'
            }
          >
            <input
              id={inputId}
              type="text"
              inputMode="text"
              placeholder={examplePlaceholder ? '' : 'e.g. 100,900,606'}
              maxLength={80}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
              aria-describedby={
                showPrompt ? `${inputId}-typing-hint` : undefined
              }
            />
            {showPrompt && (
              <span
                id={`${inputId}-typing-hint`}
                className="search-row__typing mono"
                aria-hidden="true"
              >
                {promptText}
                {showTyping && (
                  <span className="search-row__typing-caret" />
                )}
              </span>
            )}
          </div>
          <button type="submit" className="btn-primary">
            Add
          </button>
        </div>
        {inputNote && (
          <p className="saved-zip-bar__note">{inputNote}</p>
        )}
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
