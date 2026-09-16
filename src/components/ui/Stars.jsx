import { Star } from "lucide-react";

import { cn } from "../../lib/cn.js";

/**
 * A star rating with its review count.
 *
 * Renders nothing when there are no approved reviews — "0.0 (0 reviews)" beside
 * a product reads as a bad score rather than as an absence of scores, and every
 * product in a new catalogue starts there.
 */
export function Stars({ value, count, className }) {
  const reviews = Number(count) || 0;
  if (reviews <= 0) return null;

  const average = Number(value) || 0;
  const rounded = Math.round(average);

  return (
    <span className={cn("flex items-center gap-1.5", className)}>
      <span className="sr-only">
        {average.toFixed(1)} out of 5, from {reviews} {reviews === 1 ? "review" : "reviews"}
      </span>

      <span aria-hidden="true" className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            size={15}
            className={cn("shrink-0", n <= rounded ? "fill-gold text-gold" : "text-line-strong")}
          />
        ))}
      </span>

      <span aria-hidden="true" className="text-ink">
        {average.toFixed(1)}
      </span>
      <span aria-hidden="true" className="text-ink-muted">
        ({reviews})
      </span>
    </span>
  );
}
