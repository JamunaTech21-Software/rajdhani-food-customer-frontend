import { useEffect } from "react";
import { Heart, MessageSquare, X } from "lucide-react";
import { Link } from "react-router";

import { CloudinaryImage } from "../components/CloudinaryImage.jsx";
import { SignInPanel } from "../components/account/SignInPanel.jsx";
import { PageHero } from "../components/layout/PageHero.jsx";
import { useSeo } from "../hooks/useSeo.js";
import { SIZES } from "../lib/cloudinary.js";
import { formatPrice } from "../lib/productDetail.js";
import { PAGE_META } from "../lib/seo.js";
import { useAuthStore } from "../stores/authStore.js";
import { useWishlistStore } from "../stores/wishlistStore.js";

function SavedProduct({ product, onRemove }) {
  return (
    <li className="group relative flex gap-4 rounded-xl border border-line bg-surface p-4">
      <Link
        to={`/products/${product.slug}`}
        className="size-24 shrink-0 overflow-hidden rounded-lg bg-ground after:absolute after:inset-0"
      >
        <CloudinaryImage
          src={product.image?.url}
          alt={product.image?.alt ?? product.name ?? ""}
          aspectRatio="1 / 1"
          sizes={SIZES.thumbnail}
          className="size-full"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <h2 className="font-display text-base font-semibold text-ink">{product.name}</h2>
        {product.category?.name ? (
          <p className="mt-0.5 text-sm text-ink-muted">{product.category.name}</p>
        ) : null}
        {product.price != null ? (
          <p className="mt-1 font-display font-bold text-brand">{formatPrice(product.price)}</p>
        ) : null}

        {/* The enquiry shortcut the scope asks for. A link to the product page
            rather than a modal here: the enquiry wants a pack size and a
            quantity, and those live there. */}
        <Link
          to={`/products/${product.slug}`}
          className="relative z-10 mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
        >
          <MessageSquare size={14} strokeWidth={2} aria-hidden="true" />
          Enquire about this
        </Link>
      </div>

      <button
        type="button"
        onClick={() => onRemove(product)}
        aria-label={`Remove ${product.name} from your wishlist`}
        className="relative z-10 grid size-11 shrink-0 place-items-center self-start rounded-full text-ink-subtle transition-colors duration-(--duration-fast) hover:bg-ground hover:text-danger"
      >
        <X size={18} strokeWidth={2} aria-hidden="true" />
      </button>
    </li>
  );
}

/**
 * The saved products page (§10).
 *
 * The list is the server's — that is what makes the first acceptance criterion
 * true without any work here: a product saved on a desktop is a row in the
 * database, so signing in on a phone shows it. There is no device-local copy to
 * reconcile, other than the guest list, which is merged once at sign-in.
 *
 * A signed-out visitor sees the sign-in panel rather than an empty list. Their
 * saved ids are kept in local storage and the hearts on the catalogue stay
 * filled, so nothing they did is lost — there is simply nothing to *show* here,
 * because the cards come from the same endpoint that needs the session.
 */
export function WishlistPage() {
  const session = useAuthStore((s) => s.status);
  const { items, status, load } = useWishlistStore((s) => ({
    items: s.items,
    status: s.status,
    load: s.load,
  }));
  const toggle = useWishlistStore((s) => s.toggle);

  // Personal, so kept out of the index — and set here, above the two early
  // returns, so the signed-out and still-checking states carry it too.
  useSeo({ ...PAGE_META.wishlist, noindex: true });

  useEffect(() => {
    if (session === "authenticated") load();
  }, [session, load]);

  if (session === "unknown") {
    return (
      <div role="status" aria-label="Checking your session" aria-busy="true" className="mx-auto max-w-md px-4 py-24">
        <div className="h-8 w-40 animate-pulse rounded bg-ground" />
        <div className="mt-4 h-40 w-full animate-pulse rounded-xl bg-ground" />
      </div>
    );
  }

  if (session !== "authenticated") {
    return (
      <div className="px-4 py-16 sm:py-24">
        <SignInPanel
          title="Your wishlist"
          description="Sign in to see everything you have saved. What you save while signed out is kept on this device and added to your account when you sign in."
        />
      </div>
    );
  }

  return (
    <>
      <PageHero title="Your wishlist" breadcrumb="Wishlist" />

      <div className="mx-auto max-w-3xl py-(--space-section) pl-(--gutter-l) pr-(--gutter-r)">
        {status === "loading" ? (
          <div role="status" aria-label="Loading your wishlist" aria-busy="true" className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 w-full animate-pulse rounded-xl bg-ground" />
            ))}
          </div>
        ) : status === "error" ? (
          <div role="alert" className="rounded-xl border border-line p-6 text-center sm:p-10">
            <p className="font-display text-lg font-semibold text-ink">We could not load your wishlist</p>
            <button
              type="button"
              onClick={load}
              className="mt-6 inline-flex h-11 items-center rounded-md bg-brand px-5 text-sm font-medium text-on-brand"
            >
              Try again
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-line p-6 text-center sm:p-10">
            <Heart size={28} strokeWidth={1.5} aria-hidden="true" className="mx-auto text-ink-subtle" />
            <p className="mt-3 font-display text-lg font-semibold text-ink">Nothing saved yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
              Tap the heart on any product to keep it here. Your list follows you to any device you
              sign in on.
            </p>
            <Link
              to="/products"
              className="mt-6 inline-flex h-11 items-center rounded-md bg-brand px-5 text-sm font-medium text-on-brand"
            >
              Browse the range
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {items.map((product) => (
              <SavedProduct key={product.id} product={product} onRemove={toggle} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
