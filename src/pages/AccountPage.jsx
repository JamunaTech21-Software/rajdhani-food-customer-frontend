import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Star } from "lucide-react";
import { Link } from "react-router";

import { ProfileForm } from "../components/account/ProfileForm.jsx";
import { SignInPanel } from "../components/account/SignInPanel.jsx";
import { PageHero } from "../components/layout/PageHero.jsx";
import { useSeo } from "../hooks/useSeo.js";
import { accountApi } from "../lib/api.js";
import { formatDate } from "../lib/format.js";
import { greetingName, initials, reviewStatus } from "../lib/session.js";
import { PAGE_META } from "../lib/seo.js";
import { signOut } from "../lib/restoreSession.js";
import { useAuthStore } from "../stores/authStore.js";

const TONE = {
  success: "bg-success-tint text-success",
  warning: "bg-warning-tint text-warning",
  danger: "bg-danger-tint text-danger",
};

function ReviewRow({ review }) {
  const status = reviewStatus(review.status);

  return (
    <li className="flex flex-col gap-2 border-t border-line py-5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {review.product?.slug ? (
          <Link to={`/products/${review.product.slug}`} className="font-medium text-ink hover:text-brand">
            {review.product.name}
          </Link>
        ) : (
          <span className="font-medium text-ink">{review.product?.name ?? "A product"}</span>
        )}

        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[status.tone]}`}>
          {status.label}
        </span>
      </div>

      {/*
        Not the catalogue's `Stars`: that one renders an *average* with a review
        count and returns nothing below one review, because "0.0 (0 reviews)"
        beside a product reads as a bad score. Here the number is this
        customer's own single rating, so it is always shown and the announced
        text says so.
      */}
      <span className="flex items-center gap-0.5">
        <span className="sr-only">You rated this {review.rating} out of 5</span>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={15}
            aria-hidden="true"
            strokeWidth={1.5}
            className={star <= review.rating ? "fill-gold text-gold" : "text-line-strong"}
          />
        ))}
      </span>

      {review.title ? <p className="font-medium text-ink">{review.title}</p> : null}
      {review.comment ? <p className="text-sm leading-relaxed text-ink-muted">{review.comment}</p> : null}

      {review.created_at ? (
        <p className="text-xs text-ink-subtle">{formatDate(review.created_at)}</p>
      ) : null}
    </li>
  );
}

/**
 * The customer account area (§10, §7.1).
 *
 * **Never cached across users** — the second acceptance criterion. Three things
 * make that true, and all three are needed:
 *
 *   * every query here is keyed by the customer's id, so one customer's cache
 *     entry cannot be read as another's;
 *   * `queryClient.clear()` runs on sign-out, so nothing survives in memory for
 *     the next person at the same browser;
 *   * the page is client-rendered from a bearer token, so there is no shared
 *     HTML for a CDN to hold. `vercel.json` caches `/assets/*` only — the
 *     document itself is never given a `Cache-Control` that would let an
 *     intermediary keep it.
 *
 * **Past enquiries are absent.** §10 asks for them and the data exists —
 * `enquiries.customer_id` is set whenever a signed-in visitor submits — but
 * there is no endpoint to read a customer's own. `/public/my/reviews` has no
 * counterpart. Requested on the ticket; a section hardcoded to nothing would
 * only look broken.
 */
export function AccountPage() {
  const status = useAuthStore((s) => s.status);
  const customer = useAuthStore((s) => s.customer);
  const queryClient = useQueryClient();

  const reviews = useQuery({
    // Keyed by customer: the id is what stops one person's reviews being served
    // from cache to the next person to sign in on the same browser.
    queryKey: ["account", "reviews", customer?.id],
    queryFn: () => accountApi.list("/public/my/reviews"),
    enabled: status === "authenticated" && Boolean(customer?.id),
    staleTime: 0,
  });

  useSeo({ ...PAGE_META.account, noindex: true });

  if (status === "unknown") {
    return (
      <div role="status" aria-label="Checking your session" aria-busy="true" className="mx-auto max-w-md px-4 py-24">
        <div className="h-8 w-40 animate-pulse rounded bg-ground" />
        <div className="mt-4 h-40 w-full animate-pulse rounded-xl bg-ground" />
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className="px-4 py-16 sm:py-24">
        <SignInPanel title="Your account" />
      </div>
    );
  }

  const items = reviews.data?.items ?? [];

  return (
    <>
      <PageHero title={`Hello, ${greetingName(customer)}`} breadcrumb="Account" />

      <div className="mx-auto max-w-(--container-max) py-(--space-section) pl-(--gutter-l) pr-(--gutter-r)">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <section aria-labelledby="profile-heading" className="rounded-xl border border-line bg-surface p-6">
            <div className="flex items-center gap-4">
              {customer?.avatar_url ? (
                // Google's own CDN, not Cloudinary — it is not ours to transform,
                // and referrerPolicy keeps the page URL out of their logs.
                <img
                  src={customer.avatar_url}
                  alt=""
                  width={56}
                  height={56}
                  referrerPolicy="no-referrer"
                  className="size-14 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-tint font-semibold text-brand"
                >
                  {initials(customer)}
                </span>
              )}

              <div className="min-w-0">
                <h2 id="profile-heading" className="truncate font-display text-lg font-semibold text-ink">
                  {customer?.name}
                </h2>
                <p className="truncate text-sm text-ink-muted">{customer?.email}</p>
              </div>
            </div>

            <div className="mt-6">
              <ProfileForm customer={customer} />
            </div>

            <button
              type="button"
              onClick={async () => {
                await signOut();
                // Nothing of this customer survives for the next person at this
                // browser — the account queries above included.
                queryClient.clear();
              }}
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-md border border-line px-4 text-sm font-medium text-ink transition-colors duration-(--duration-fast) hover:border-danger hover:text-danger"
            >
              <LogOut size={16} strokeWidth={2} aria-hidden="true" />
              Sign out
            </button>
          </section>

          <section aria-labelledby="reviews-heading" className="rounded-xl border border-line bg-surface p-6">
            <h2 id="reviews-heading" className="font-display text-lg font-semibold text-ink">
              Your reviews
            </h2>
            <span aria-hidden="true" className="mt-3 mb-5 block h-0.5 w-12 bg-gold" />

            {reviews.isPending ? (
              <div role="status" aria-label="Loading your reviews" aria-busy="true" className="space-y-4">
                {[0, 1].map((i) => (
                  <div key={i} className="h-20 w-full animate-pulse rounded bg-ground" />
                ))}
              </div>
            ) : reviews.isError ? (
              <p role="alert" className="text-sm text-ink-muted">
                We could not load your reviews just now.
              </p>
            ) : items.length === 0 ? (
              <div className="text-sm text-ink-muted">
                <p>You have not written a review yet.</p>
                <Link to="/products" className="mt-4 inline-flex font-medium text-brand hover:underline">
                  Browse the range
                </Link>
              </div>
            ) : (
              <ul>
                {items.map((review) => (
                  <ReviewRow key={review.id} review={review} />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
