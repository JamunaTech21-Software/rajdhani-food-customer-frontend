import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

import { CloudinaryImage } from "./CloudinaryImage.jsx";
import { cn } from "../lib/cn.js";
import { SIZES } from "../lib/cloudinary.js";
import { readableOn } from "@shared/theme/color.js";

/**
 * One product, as it appears in any grid or carousel.
 *
 * Lives outside `components/home/` because RTPP-60's listing needs exactly this
 * card — building it twice is how the two drift.
 *
 * `badge_color` is a per-product hex **from the API**, so it is applied as an
 * inline style rather than a class: Tailwind cannot generate a class for an
 * arbitrary runtime value, and this is data an editor chose, not a colour the
 * code decided. The text colour on top is computed for contrast rather than
 * assumed white — a gold badge with white text fails AA, and the admin lets an
 * editor pick any colour at all.
 *
 * ## Two variants
 *
 * `default` is the catalogue card: bordered, left-aligned, two lines of
 * `short_description`. `/products` and the related-products row both use it.
 *
 * `compact` is the home carousel's, from the reference: no border, the image
 * on the same pale panel as the card, centred, and a **single line of
 * `tagline`** rather than the description. Narrower tracks and a row a visitor
 * scans rather than reads are what the shorter line is for — "Bold. Dark.
 * Traditional." says enough at 240px, where two lines of prose do not.
 *
 * A variant rather than a second component, and rather than changing all
 * three surfaces: only the home page was redesigned, and `/products` was
 * signed off separately. Two cards in the codebase is a real cost — if the
 * catalogue is ever redrawn to match, this variant should absorb it rather
 * than a third appearing.
 *
 * The badge is kept in **both** variants. The reference shows none, but
 * `badge_text` is live editable data — dropping it to match a picture would
 * hide a field the admin still offers. The wishlist button that used to sit
 * beside it went with the account feature.
 */
export function ProductCard({
  product,
  priority = false,
  sizes = SIZES.productCard,
  variant = "default",
}) {
  if (!product?.slug) return null;

  const badge = product.badge_text?.trim();
  const compact = variant === "compact";
  // Falls back to the description: `tagline` is nullable, and a card with a
  // name and nothing under it looks unfinished next to five that have one.
  const line = compact ? (product.tagline ?? product.short_description) : product.short_description;

  return (
    <article
      className={cn(
        // Square, not rounded. Traced on the comp, the card panel insets by
        // three pixels over three rows at its corner — a radius small enough
        // to read as none, where the 24px it had was unmistakable.
        "group relative flex h-full flex-col overflow-hidden transition-shadow duration-(--duration-fast) hover:shadow-card",
        compact ? "bg-ground text-center" : "border border-line bg-surface",
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-ground">
        <CloudinaryImage
          src={product.image?.url}
          alt={product.image?.alt ?? product.name ?? ""}
          sizes={sizes}
          priority={priority}
          className="size-full transition-transform duration-(--duration-slow) group-hover:scale-105"
        />

        {badge ? (
          <span
            className={cn(
              "absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide shadow-card",
              compact && "hidden sm:inline-block",
            )}
            style={{
              backgroundColor: product.badge_color ?? undefined,
              color: product.badge_color ? readableOn(product.badge_color) : undefined,
            }}
          >
            {badge}
          </span>
        ) : null}
      </div>

      {/* 83px wide at four across on a phone, 240px from `sm`. The padding and
          the type step with it — at 16px a product name is one word a line. */}
      <div className="flex flex-1 flex-col p-2 sm:p-4">
        <h3 className="text-xs font-semibold text-ink sm:text-base">
          {/* The whole card is the link target, via the overlay below, but the
              accessible name comes from this heading rather than "Read more". */}
          <Link to={`/products/${product.slug}`} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>

        {line ? (
          <p
            className={cn(
              "mt-1 text-[0.6875rem] leading-snug text-ink-muted sm:mt-1.5 sm:text-sm sm:leading-relaxed",
              compact ? "line-clamp-1" : "line-clamp-2",
            )}
          >
            {line}
          </p>
        ) : null}

        <span
          className={cn(
            "mt-2 inline-flex items-center gap-1 text-[0.6875rem] font-medium text-brand sm:mt-4 sm:gap-1.5 sm:text-sm",
            compact && "justify-center",
          )}
        >
          {compact ? "View Product" : "View Details"}
          <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}
