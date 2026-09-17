import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

import { ProductCard } from "../ProductCard.jsx";
import { SIZES } from "../../lib/cloudinary.js";
import { useScrollEdges } from "../../hooks/useScrollEdges.js";

/**
 * The premium collection carousel (§10.1).
 *
 * A scroll-snapping list rather than a JS carousel. It is a row of links, and a
 * native scroll container already gives keyboard scrolling, touch swipe,
 * momentum, and correct behaviour when a card is focused by Tab — all of which
 * a transform-based slider has to reimplement, usually imperfectly.
 *
 * At four items and up it scrolls on a phone and lays out as a grid on desktop,
 * so the common case never needs interaction at all.
 */
export function FeaturedProducts({ products }) {
  const [stripRef, stripProps] = useScrollEdges();

  if (!products?.length) return null;

  return (
    <section aria-labelledby="featured-heading" className="py-(--space-section)">
      <div className="mx-auto max-w-(--container-max) pl-(--gutter-l) pr-(--gutter-r)">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-eyebrow font-semibold uppercase tracking-[0.2em] text-brand">
              Our Products
            </p>
            <h2 id="featured-heading" className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">
              Our Premium Tea Range
            </h2>
          </div>

          <Link
            to="/products"
            className="inline-flex h-11 items-center gap-2 rounded-md border border-line px-5 text-sm font-medium text-ink transition-colors duration-(--duration-fast) hover:border-brand hover:text-brand"
          >
            View All Products
            <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>

        <ul
          ref={stripRef}
          {...stripProps}
          className="scroll-fade mt-8 grid auto-cols-[minmax(15rem,1fr)] grid-flow-col gap-5 overflow-x-auto pb-4 [scrollbar-width:thin] snap-x snap-mandatory lg:grid-flow-row lg:grid-cols-4 lg:overflow-visible"
        >
          {products.map((product, index) => (
            <li key={product.id} className="snap-start">
              {/* The first two are likely above the fold on a wide screen, so
                  they load eagerly; the rest stay lazy. */}
              <ProductCard product={product} priority={index < 2} sizes={SIZES.carouselCard} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
