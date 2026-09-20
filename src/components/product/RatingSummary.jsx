import { Star } from "lucide-react";

import { averageRating, distributionRows } from "../../lib/reviews.js";

/**
 * The average and the distribution bars (§10.2).
 *
 * Every number here comes from `meta`, which the API computes over **all**
 * approved reviews. The list beside it is a page of twelve, so the two describe
 * different sets on purpose — and the count says which, rather than leaving a
 * visitor to infer that five bars summing to thirty belong to the twelve rows
 * underneath.
 */
export function RatingSummary({ meta, shown }) {
  const average = averageRating(meta);
  const total = Number(meta?.rating_count) || 0;
  const rows = distributionRows(meta);

  if (total === 0) return null;

  return (
    <div className="grid gap-6 rounded-xl bg-ground p-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-8">
      <div className="text-center sm:border-r sm:border-line sm:pr-8">
        <p className="font-display text-4xl font-bold text-ink">{average?.toFixed(1)}</p>

        <span className="mt-2 flex items-center justify-center gap-0.5">
          <span className="sr-only">{average} out of 5</span>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={15}
              strokeWidth={1.5}
              aria-hidden="true"
              className={star <= Math.round(average ?? 0) ? "fill-gold text-gold" : "text-line-strong"}
            />
          ))}
        </span>

        <p className="mt-2 whitespace-nowrap text-sm text-ink-muted">
          {total} {total === 1 ? "review" : "reviews"}
        </p>
      </div>

      <ul className="flex flex-col justify-center gap-2">
        {rows.map((row) => (
          <li key={row.stars} className="flex items-center gap-3 text-sm">
            <span className="w-12 shrink-0 tabular-nums text-ink-muted">
              {row.stars} star{row.stars === 1 ? "" : "s"}
            </span>

            {/*
              `aria-hidden` on the bar, with the numbers read instead. A
              progressbar role here would have a screen reader announce five
              meters in a row; "twelve of thirty" is the thing being conveyed.
            */}
            <span aria-hidden="true" className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-line">
              <span
                className="block h-full rounded-full bg-gold transition-[width] duration-(--duration-panel)"
                style={{ width: `${row.percent}%` }}
              />
            </span>

            <span className="w-8 shrink-0 text-right tabular-nums text-ink-muted">{row.count}</span>
          </li>
        ))}
      </ul>

      {/* Only when the two differ, which is the only time it is worth saying. */}
      {shown > 0 && shown < total ? (
        <p className="text-sm text-ink-subtle sm:col-span-2">
          Showing {shown} of {total} reviews.
        </p>
      ) : null}
    </div>
  );
}
