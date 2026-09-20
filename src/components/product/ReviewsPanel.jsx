import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Link } from "react-router";

import { RatingSummary } from "./RatingSummary.jsx";
import { ReviewForm } from "./ReviewForm.jsx";
import { accountApi, publicApi } from "../../lib/api.js";
import { formatDate } from "../../lib/format.js";
import { ownReviewFor, submissionState } from "../../lib/reviews.js";
import { reviewStatus } from "../../lib/session.js";
import { useAuthStore } from "../../stores/authStore.js";

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
 * hold no matter what this component does. A submitted review is `PENDING` and
 * simply is not in the response.
 *
 * The customer's own review is fetched separately, from `/public/my/reviews`,
 * because it is the one review they may see before anyone has approved it. That
 * is also how the tab knows to offer an edit rather than a second submission: a
 * second POST is a 409, and finding that out by submitting is a poor way to
 * learn it.
 */
export function ReviewsPanel({ product }) {
  const session = useAuthStore((s) => s.status);
  const customer = useAuthStore((s) => s.customer);

  const reviews = useQuery({
    queryKey: ["public", "reviews", product.slug],
    queryFn: () => publicApi.list(`/public/products/${encodeURIComponent(product.slug)}/reviews`),
    enabled: Boolean(product.slug),
  });

  const mine = useQuery({
    // Keyed by customer, like every account query: without the id one person's
    // review is served from cache to the next.
    queryKey: ["account", "reviews", customer?.id],
    queryFn: () => accountApi.list("/public/my/reviews"),
    enabled: session === "authenticated" && Boolean(customer?.id),
    staleTime: 0,
  });

  const items = reviews.data?.items ?? [];
  const meta = reviews.data?.meta ?? null;
  const ownReview = ownReviewFor(mine.data?.items, product.id);
  const state = submissionState({ session, ownReview });

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
        <p className="text-ink-muted">
          No reviews yet. Be the first to tell others what you think of this tea.
        </p>
      )}

      <div>
        <h3 className="font-display text-lg font-semibold text-ink">
          {state === "edit" || state === "pending" ? "Your review" : "Write a review"}
        </h3>
        <span aria-hidden="true" className="mt-3 mb-4 block h-0.5 w-12 bg-gold" />

        {state === "checking" ? (
          <div role="status" aria-busy="true" className="h-11 w-48 animate-pulse rounded bg-ground" />
        ) : state === "sign-in" ? (
          // The list is public; writing is not. Saying which, rather than
          // hiding the form and leaving a visitor to wonder whether reviews
          // are closed.
          <div className="rounded-xl border border-line p-5">
            <p className="text-ink-muted">
              <Link to="/account" className="font-medium text-brand hover:underline">
                Sign in
              </Link>{" "}
              to write a review. Anyone can read them; only customers can add one, which is what
              keeps them worth reading.
            </p>
          </div>
        ) : state === "pending" ? (
          <div className="rounded-xl bg-warning-tint p-5">
            <p className="font-medium text-ink">{reviewStatus(ownReview.status).label}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
              Our team reads every review before it appears here. Yours is with them now.
            </p>
          </div>
        ) : (
          <ReviewForm
            // Remounted when the review changes identity, so the form's
            // defaults are the review being edited rather than whatever was
            // loaded first.
            key={ownReview?.id ?? "new"}
            slug={product.slug}
            ownReview={ownReview}
            onSaved={() => {
              mine.refetch();
              // The public list too: an edit removes an approved review from
              // it, and leaving the old copy on screen contradicts the notice
              // the form just showed.
              reviews.refetch();
            }}
          />
        )}
      </div>
    </div>
  );
}
