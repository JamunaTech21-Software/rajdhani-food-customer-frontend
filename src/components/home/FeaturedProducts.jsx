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

  // The gap is not on the element, so it comes from the computed style —
  // hardcoding it here would drift the moment the `gap-5` changes.
  const gap = Number.parseFloat(getComputedStyle(strip).columnGap) || 0;
  return card.getBoundingClientRect().width + gap;
}

function Arrow({ direction, disabled, onClick }) {
  const next = direction === "next";
  const Glyph = next ? ChevronRight : ChevronLeft;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={next ? "Show more products" : "Show previous products"}
      className={cn(
        // A flex sibling of the strip, not an overlay on it. The reference
        // draws these in the margin *beside* the cards, and positioning them
        // absolutely meant either covering the outermost card or hanging past
        // the container and giving the page a horizontal scrollbar (G1).
        // As a sibling they take their own width and neither can happen.
        "hidden size-11 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink xl:grid",
        "transition-colors duration-(--duration-fast) hover:border-brand hover:text-brand",
        // Faded rather than removed at the ends: a control that disappears
        // moves the strip beside it, and the row is a fixed landmark.
        "disabled:pointer-events-none disabled:opacity-30",
      )}
    >
      <Glyph size={20} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}

/**
 * The premium collection carousel (§10.1).
 *
 * A scroll-snapping list rather than a JS carousel. It is a row of links, and a
 * native scroll container already gives keyboard scrolling, touch swipe,
 * momentum, and correct behaviour when a card is focused by Tab — all of which
 * a transform-based slider has to reimplement, usually imperfectly. The arrows
 * drive that same container with `scrollBy`, so none of it is given up.
 *
 * **Six across from `xl`**, as the reference draws. The track is a fraction of
 * the strip rather than a fixed width, because the arrows take 44px each out
 * of the row: a hardcoded card width would have to be recalculated by hand
 * every time that changed, and would be silently wrong in between. Below `xl`
 * the tracks are a fixed 15rem and the strip simply scrolls.
 *
 * **No edge fade.** The other three strips on the site mask their edges to say
 * there is more — this one has arrows that say it outright, and the reference
 * shows clean card edges. The scrollbar is hidden only where the arrows exist,
 * so the affordance is never absent: below `xl` the thin scrollbar is still
 * the thing that tells you the row scrolls.
 */
export function FeaturedProducts({ products }) {
  const [stripRef, stripProps] = useScrollEdges();

  if (!products?.length) return null;

  // The hook already measures what is past each edge; the arrows ask the same
  // question, so they read the same answer rather than measuring again.
  const canScrollBack = stripProps["data-overflow-start"];
  const canScrollOn = stripProps["data-overflow-end"];

  const scroll = (sign) => {
    const strip = stripRef.current;
    if (!strip) return;

    strip.scrollBy({
      left: sign * stepWidth(strip),
      // Honoured explicitly: `scroll-behavior` in CSS respects the media
      // query, but a `behavior` passed here overrides it, so asking for smooth
      // unconditionally would animate for someone who asked us not to.
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  return (
    <section aria-labelledby="featured-heading" className="py-(--space-section)">
      <div className="mx-auto max-w-(--container-max) pl-(--gutter-l) pr-(--gutter-r)">
        {/*
          Heading and "View All" on one line, which is what the mobile
          reference draws.

          Measured rather than estimated: the heading renders at 227px and the
          full-length button at 180px, against the 288px a 320 phone has and
          328px at 360. The heading drops two steps below `sm` and the button
          loses its last word, which brings the pair to 309px — one line from
          360 up.

          **No `flex-wrap`.** At 320 even 309px does not fit, and wrapping
          would drop the button under the heading, which is the thing being
          fixed. Without it the heading takes two lines instead and the button
          stays beside it, which is what "on the same line" means when there
          is not room for one line of heading.
        */}
        <div className="flex items-end justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="text-eyebrow font-semibold uppercase tracking-[0.2em] text-brand">
              Our Products
            </p>
            <h2 id="featured-heading" className="mt-2 font-display text-lg font-bold text-ink sm:text-4xl">
              Our Premium Tea Range
            </h2>
          </div>

          <Link
            to="/products"
            // Green, not grey. Sampled off the comp: the border is #9fc2ab,
            // which is the brand green at about 40% over white, and the label
            // is #1f4e2b against the brand token's #1b5e20. Ours was
            // `border-line` and `text-ink` — a grey outline with near-black
            // text, which reads as a form control rather than a way in.
            className="inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-brand/40 px-3 text-xs font-medium text-brand transition-colors duration-(--duration-fast) hover:border-brand hover:bg-brand hover:text-on-brand sm:gap-2 sm:px-5 sm:text-sm"
          >
            {/* "View All" on a phone, the full label from `sm`. The last word
                stays in the accessible name at every width, so the link still
                announces what it lists — WCAG 2.5.3 wants the name to contain
                the visible text, and "View All Products" contains "View All". */}
            View All<span className="sr-only sm:not-sr-only sm:inline"> Products</span>
            <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-8 flex items-center gap-3">
          <Arrow direction="previous" disabled={!canScrollBack} onClick={() => scroll(-1)} />

          <ul
            ref={stripRef}
            {...stripProps}
            /*
              `min-w-0` is what lets the strip shrink inside the flex row. Without
              it a grid of six tracks reports its content width as its minimum and
              pushes the right-hand arrow off the container.

              The `xl` track is the strip's own width less the five 20px gaps,
              divided by six — a percentage, so it follows the row rather than
              having to be re-derived whenever the arrows change size.
            */
            /*
              `/3.8` rather than `/4`, so the fourth card is cut by the edge.

              Four tracks fitted the strip exactly, which made a scrolling row
              look like a finished grid — there was nothing to say more
              existed. The mobile reference clips its fourth card, and that
              overhang is the affordance. At 390 this puts the card at 88px
              against the reference's 91px and leaves ~18px of the next one
              showing.

              Still a fraction of the strip rather than a fixed width, so it
              keeps scaling with the viewport instead of needing a breakpoint
              per phone size.
            */
            className="grid min-w-0 flex-1 auto-cols-[calc((100%-1.5rem)/3.8)] grid-flow-col gap-2 overflow-x-auto pb-4 [scrollbar-width:thin] snap-x snap-mandatory sm:auto-cols-[minmax(15rem,1fr)] sm:gap-5 xl:auto-cols-[calc((100%-100px)/6)] xl:pb-0 xl:[scrollbar-width:none] xl:[&::-webkit-scrollbar]:hidden"
          >
            {products.map((product, index) => (
              <li key={product.id} className="snap-start">
                {/* The first row is above the fold on a wide screen, so those
                    load eagerly; the rest stay lazy. */}
                <ProductCard
                  product={product}
                  priority={index < 3}
                  sizes={SIZES.carouselCard}
                  variant="compact"
                />
              </li>
            ))}
          </ul>

          <Arrow direction="next" disabled={!canScrollOn} onClick={() => scroll(1)} />
        </div>
      </div>
    </section>
  );
}
