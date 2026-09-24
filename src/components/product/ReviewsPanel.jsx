import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";

import { RatingSummary } from "./RatingSummary.jsx";
import { publicApi } from "../../lib/api.js";
import { formatDate } from "../../lib/format.js";

function Review({ review }) {
  return (
    <li className="border-t border-line py-5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-0.5">
          <span className="sr-only">Rated {review.rating} out of 5</span>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={14}
              strokeWidth={1.5}
              aria-hidden="true"
              className={star <= review.rating ? "fill-gold text-gold" : "text-line-strong"}
            />
          ))}
        </span>

        <span className="text-sm font-medium text-ink">{review.customer_name}</span>
        {review.created_at ? (
          <span className="text-sm text-ink-subtle">{formatDate(review.created_at)}</span>
        ) : null}
      </div>

      {review.title ? <p className="mt-2 font-medium text-ink">{review.title}</p> : null}
      <p className="mt-1 leading-relaxed text-ink-muted">{review.comment}</p>
    </li>
  );
}

/**
 * The reviews tab (§10.2).
 *
 * The list is **approved reviews only** — that is the endpoint's contract, not
 * a filter applied here, which is what makes the first acceptance criterion
 * hold no matter what this component does.
 *
 * **Read-only.** Reviews are written and approved in the admin panel and
 * arrive here through `/public/products/{slug}/reviews`; the customer site has
 * no sign-in, so it has nobody to attribute a submission to. The form that
 * used to sit under this list, the "your review" state and the fetch of
 * `/public/my/reviews` went with the account feature.
 */
export function ReviewsPanel({ product }) {
  const reviews = useQuery({
    queryKey: ["public", "reviews", product.slug],
    queryFn: () => publicApi.list(`/public/products/${encodeURIComponent(product.slug)}/reviews`),
    enabled: Boolean(product.slug),
  });

  const items = reviews.data?.items ?? [];
  const meta = reviews.data?.meta ?? null;

  return (
    <div className="flex flex-col gap-8">
      <RatingSummary meta={meta} shown={items.length} />

      {reviews.isPending ? (
        <div role="status" aria-label="Loading reviews" aria-busy="true" className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-20 w-full animate-pulse rounded bg-ground" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <ul>
          {items.map((review) => (
            <Review key={review.id} review={review} />
          ))}
        </ul>
      ) : (
        // "Be the first to tell others what you think" went with the form. An
        // empty state that invites an action the page no longer offers is a
        // dead end, and a visitor who looks for the button and finds none
        // reads it as broken rather than as absent.
        <p className="text-ink-muted">No reviews for this tea yet.</p>
      )}
    </div>
  );
}
