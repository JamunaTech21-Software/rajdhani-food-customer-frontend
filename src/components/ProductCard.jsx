import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

import { CloudinaryImage } from "./CloudinaryImage.jsx";
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
 */
export function ProductCard({ product, priority = false, sizes = SIZES.productCard }) {
  if (!product?.slug) return null;

  const badge = product.badge_text?.trim();

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface transition-shadow duration-(--duration-fast) hover:shadow-card">
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
            className="absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide shadow-card"
            style={{
              backgroundColor: product.badge_color ?? undefined,
              color: product.badge_color ? readableOn(product.badge_color) : undefined,
            }}
          >
            {badge}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-base font-semibold text-ink">
          {/* The whole card is the link target, via the overlay below, but the
              accessible name comes from this heading rather than "Read more". */}
          <Link to={`/products/${product.slug}`} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>

        {product.short_description ? (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-muted">
            {product.short_description}
          </p>
        ) : null}

        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand">
          View Details
          <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}
