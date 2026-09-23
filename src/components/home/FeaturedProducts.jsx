import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router";

import { ProductCard } from "../ProductCard.jsx";
import { cn } from "../../lib/cn.js";
import { SIZES } from "../../lib/cloudinary.js";
import { useScrollEdges } from "../../hooks/useScrollEdges.js";

/** One track plus its gap, measured rather than assumed. */
function stepWidth(strip) {
  const card = strip?.firstElementChild;
  if (!card) return 190;

  const gap = Number.parseFloat(getComputedStyle(strip).columnGap) || 0;
  return card.getBoundingClientRect().width + gap;
}

function Arrow({ direction, disabled, onClick }) {
  const next = direction === "next";
  const Glyph = next ? ChevronRight : ChevronLeft;

  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      aria-label={next ? "Show more products" : "Show previous products"}
      className={cn(
        "hidden size-11 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink xl:grid",
        "transition-colors duration-(--duration-fast) hover:border-brand hover:text-brand",
        "disabled:pointer-events-none disabled:opacity-30",
      )}
    >
      <Glyph size={20} strokeWidth={2} aria-hidden='true' />
    </button>
  );
}

/**
 * The premium collection carousel (§10.1).
 */
export function FeaturedProducts({ products }) {
  const [stripRef, stripProps] = useScrollEdges();

  if (!products?.length) return null;

  const canScrollBack = stripProps["data-overflow-start"];
  const canScrollOn = stripProps["data-overflow-end"];

  const scroll = (sign) => {
    const strip = stripRef.current;
    if (!strip) return;

    strip.scrollBy({
      left: sign * stepWidth(strip),
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  return (
    <section
      aria-labelledby='featured-heading'
      className='py-(--space-section)'
    >
      <div className='mx-auto max-w-(--container-max) pl-(--gutter-l) pr-(--gutter-r)'>
        <div className='flex items-end justify-between gap-3 sm:gap-4'>
          <div className='min-w-0'>
            <p className='hidden text-eyebrow font-semibold uppercase tracking-[0.2em] text-brand sm:block'>
              Our Products
            </p>

            <h2
              id='featured-heading'
              className='mt-2 font-display text-xl font-bold text-ink sm:text-4xl'
            >
              Our Premium Tea Range
            </h2>
          </div>

          <Link
            to='/products'
            className='inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-brand/40 px-3 text-xs font-bold text-brand transition-colors duration-(--duration-fast) hover:border-brand hover:bg-brand hover:text-on-brand sm:gap-2 sm:px-5 sm:text-sm'
          >
            View All
            <span className='sr-only sm:not-sr-only sm:inline'> Products</span>
            <ArrowRight size={15} strokeWidth={2} aria-hidden='true' />
          </Link>
        </div>

        <div className='mt-8 flex items-center gap-3'>
          <Arrow
            direction='previous'
            disabled={!canScrollBack}
            onClick={() => scroll(-1)}
          />

          <ul
            ref={stripRef}
            {...stripProps}
            className='grid min-w-0 flex-1 auto-cols-[calc((100%-1.5rem)/3.8)] grid-flow-col gap-2 overflow-x-auto pb-4 [scrollbar-width:thin] snap-x snap-mandatory sm:auto-cols-[minmax(15rem,1fr)] sm:gap-5 xl:auto-cols-[calc((100%-100px)/6)] xl:pb-0 xl:[scrollbar-width:none] xl:[&::-webkit-scrollbar]:hidden'
          >
            {products.map((product, index) => (
              <li key={product.id} className='snap-start'>
                <ProductCard
                  product={product}
                  priority={index < 3}
                  sizes={SIZES.carouselCard}
                  variant='compact'
                />
              </li>
            ))}
          </ul>

          <Arrow
            direction='next'
            disabled={!canScrollOn}
            onClick={() => scroll(1)}
          />
        </div>
      </div>
    </section>
  );
}
