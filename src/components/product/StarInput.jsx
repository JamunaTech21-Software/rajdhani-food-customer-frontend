import { Star } from "lucide-react";
import { useId, useState } from "react";

import { cn } from "../../lib/cn.js";

const LABELS = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very good",
  5: "Excellent",
};

/**
 * The star input (§10.2).
 *
 * A **radio group**, not five buttons. Five buttons look identical and behave
 * almost identically, and then arrow keys do nothing, nothing is announced as
 * selected, and the value is not part of the form. Native radios give all of
 * that for free; they are only hidden visually, and the star is their label.
 *
 * The hover preview is deliberately not applied on focus. Tabbing into a group
 * lands on the checked radio, and previewing there would show a rating the
 * customer has not chosen as though they had.
 */
export function StarInput({ value, onChange, name = "rating", error }) {
  const groupId = useId();
  const [hovered, setHovered] = useState(0);

  const shown = hovered || value || 0;

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-sm font-medium text-ink">
        Your rating
        <span className="ml-0.5 text-danger" aria-hidden="true">
          *
        </span>
      </legend>

      <div
        className="flex items-center gap-1"
        onMouseLeave={() => setHovered(0)}
        aria-describedby={error ? `${groupId}-error` : undefined}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <label
            key={star}
            onMouseEnter={() => setHovered(star)}
            className="cursor-pointer p-1"
            title={LABELS[star]}
          >
            <input
              type="radio"
              name={name}
              value={star}
              checked={value === star}
              onChange={() => onChange(star)}
              className="sr-only"
            />
            {/* The accessible name for each option — "3 stars, Good" — so the
                group is usable without seeing the stars at all. */}
            <span className="sr-only">
              {star} star{star === 1 ? "" : "s"}, {LABELS[star]}
            </span>
            <Star
              size={28}
              strokeWidth={1.5}
              aria-hidden="true"
              className={cn(
                "transition-colors duration-(--duration-fast)",
                star <= shown ? "fill-gold text-gold" : "text-line-strong",
              )}
            />
          </label>
        ))}

        {value ? <span className="ml-2 text-sm text-ink-muted">{LABELS[value]}</span> : null}
      </div>

      {error ? (
        <span id={`${groupId}-error`} role="alert" className="text-sm text-danger">
          {error}
        </span>
      ) : null}
    </fieldset>
  );
}
