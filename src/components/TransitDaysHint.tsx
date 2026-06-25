import { TRANSIT_DAYS_TOOLTIP } from '../labels';

interface TransitDaysHintProps {
  /** Accessible label override for the ? control. */
  ariaLabel?: string;
}

/** Superscript ? with hover/focus tooltip explaining transit-day methodology. */
export function TransitDaysHint({
  ariaLabel = 'How transit days are calculated',
}: TransitDaysHintProps) {
  return (
    <span className="transit-hint">
      <sup
        className="transit-hint__mark"
        tabIndex={0}
        aria-label={ariaLabel}
        title={TRANSIT_DAYS_TOOLTIP}
      >
        ?
      </sup>
      <span className="transit-hint__tooltip" role="tooltip">
        {TRANSIT_DAYS_TOOLTIP}
      </span>
    </span>
  );
}

interface TransitDayTextProps {
  days: number;
  /** Include the methodology hint after the label. */
  hint?: boolean;
}

/** e.g. "2 days" with optional ? superscript. */
export function TransitDayText({ days, hint = false }: TransitDayTextProps) {
  return (
    <>
      {days} day{days === 1 ? '' : 's'}
      {hint && <TransitDaysHint />}
    </>
  );
}
