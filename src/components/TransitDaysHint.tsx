import { SHIP_SPEED_MILE_TOOLTIP, TRANSIT_DAYS_TOOLTIP } from '../labels';

interface TransitDaysHintProps {
  /** Accessible label override for the ? control. */
  ariaLabel?: string;
}

/** Superscript ? with hover/focus tooltip explaining transit-day methodology. */
export function TransitDaysHint({
  ariaLabel = 'How transit days are calculated',
}: TransitDaysHintProps) {
  return (
    <SuperscriptHint
      ariaLabel={ariaLabel}
      tooltip={TRANSIT_DAYS_TOOLTIP}
      title={TRANSIT_DAYS_TOOLTIP}
    >
      ?
    </SuperscriptHint>
  );
}

interface SuperscriptHintProps {
  children: React.ReactNode;
  ariaLabel: string;
  tooltip: string;
  /** Native title tooltip (omit for hover-only custom tooltip). */
  title?: string;
}

/** Superscript mark with CSS hover/focus tooltip. */
export function SuperscriptHint({
  children,
  ariaLabel,
  tooltip,
  title,
}: SuperscriptHintProps) {
  return (
    <span className="transit-hint">
      <sup
        className="transit-hint__mark"
        tabIndex={0}
        aria-label={ariaLabel}
        {...(title ? { title } : {})}
      >
        {children}
      </sup>
      <span className="transit-hint__tooltip" role="tooltip">
        {tooltip}
      </span>
    </span>
  );
}

/** Mile thresholds for 1/2/3-day ship speed (hover only). */
export function ShipSpeedHint() {
  return (
    <SuperscriptHint
      ariaLabel="Ship speed mile thresholds"
      tooltip={SHIP_SPEED_MILE_TOOLTIP}
    >
      *
    </SuperscriptHint>
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
