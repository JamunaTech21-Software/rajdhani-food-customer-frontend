import { ArrowRight, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router";

import { CloudinaryImage } from "../CloudinaryImage.jsx";
import { cn } from "../../lib/cn.js";
import { advance, swipeIntent } from "../../lib/carousel.js";
import { SIZES } from "../../lib/cloudinary.js";
import { isExternal } from "../../lib/nav.js";

function Cta({ label, url, variant = "primary" }) {
  if (!label || !url) return null;

  const className = cn(
    "inline-flex h-12 items-center gap-2 rounded-md px-6 text-sm font-medium transition-colors duration-(--duration-fast)",
    variant === "primary"
      ? "bg-brand text-on-brand hover:bg-brand-dark"
      : "border border-ink-inverse/40 bg-surface/10 text-ink-inverse backdrop-blur-sm hover:bg-surface/20",
  );

  // A download CTA gets a download glyph rather than an arrow — the comps use
  // "Download Catalogue" beside "Explore Our Products", and the two should not
  // look like the same kind of action.
  const Glyph = /^\/downloads\//.test(url) ? Download : ArrowRight;
  const content = (
    <>
      {label}
      <Glyph size={16} strokeWidth={2} aria-hidden="true" />
    </>
  );

  if (isExternal(url)) {
    return (
      <a href={url} className={className}>
        {content}
      </a>
    );
  }
  return (
    <Link to={url} className={className}>
      {content}
    </Link>
  );
}

function Slide({ banner, priority }) {
  const image = banner.desktop_image;
  // overlay_opacity is a 0–100 integer from the admin's slider. It is data, so
  // it lands as a style rather than a class — Tailwind cannot generate a class
  // per arbitrary value, and a hardcoded ramp would ignore what was set.
  const overlay = Math.min(Math.max(banner.overlay_opacity ?? 40, 0), 100) / 100;

  return (
    // `--hero-min` caps 32rem against the viewport height, so a phone held
    // sideways can still show one whole slide. See index.css.
    <div className="relative isolate min-h-(--hero-min) overflow-hidden">
      {image?.url ? (
        <CloudinaryImage
          src={image.url}
          alt={image.alt ?? ""}
          sizes={SIZES.full}
          priority={priority}
          className="absolute inset-0 -z-10 size-full"
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-brand-deep" />
      )}

      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-ink"
        style={{ opacity: overlay }}
      />

      <div className="mx-auto flex h-full max-w-(--container-max) flex-col justify-center py-20 pl-(--gutter-l) pr-(--gutter-r)">
        <div className="max-w-xl">
          {banner.eyebrow_text ? (
            <p className="text-eyebrow font-semibold uppercase tracking-[0.2em] text-gold">
              {banner.eyebrow_text}
            </p>
          ) : null}

          {/* Two lines: the plain half and the highlighted half. The comps set
              the highlight in the brand colour on its own line. */}
          {banner.title || banner.title_highlight ? (
            <h1 className="mt-3 font-display text-4xl font-bold leading-[1.1] text-ink-inverse sm:text-5xl lg:text-6xl">
              {banner.title ? <span className="block">{banner.title}</span> : null}
              {banner.title_highlight ? (
                <span className="block text-gold">{banner.title_highlight}</span>
              ) : null}
            </h1>
          ) : null}

          {banner.subtitle ? (
            <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-inverse/85 sm:text-lg">
              {banner.subtitle}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <Cta label={banner.primary_cta_label} url={banner.primary_cta_url} />
            <Cta label={banner.secondary_cta_label} url={banner.secondary_cta_url} variant="secondary" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The hero (§10.1).
 *
 * One banner renders as a still; several render as a slider. The controls are
 * only built when there is something to move between — a previous/next pair
 * over a single slide is two dead buttons in the tab order.
 *
 * No autoplay. A hero that advances on its own moves the link someone was
 * reaching for, and pausing it is another control to get right; §18's AA bar
 * treats uncontrolled motion as a failure rather than a flourish.
 */
export function Hero({ banners }) {
  const slides = banners ?? [];
  const [index, setIndex] = useState(0);
  const start = useRef(null);

  if (slides.length === 0) return null;

  const many = slides.length > 1;
  const current = slides[Math.min(index, slides.length - 1)];

  /*
    Swipe, in about ten lines and no dependency (plan.md D3).

    Pointer events rather than touch events, so a trackpad drag and a stylus
    work the same way. The judgement — was that a swipe, and which way — is in
    `swipeIntent`, where it can be tested; what is left here is remembering
    where the finger went down.
  */
  const onPointerDown = (event) => {
    start.current = event.pointerType === "mouse" ? null : { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event) => {
    const from = start.current;
    start.current = null;
    if (!from) return;

    const direction = swipeIntent(event.clientX - from.x, event.clientY - from.y);
    if (direction) setIndex((i) => advance(i, slides.length, direction === "next" ? 1 : -1));
  };

  return (
    <section
      aria-label="Highlights"
      className="relative"
      {...(many
        ? { onPointerDown, onPointerUp, onPointerCancel: () => (start.current = null) }
        : null)}
    >
      <Slide banner={current} priority />

      {many ? (
        /*
          One control row rather than arrows floating at the sides.

          The side arrows sat at `top-1/2` over a headline that is full-width on
          a phone, so on the screens where they mattered most they covered the
          thing they were pointing at. The comps show no hero controls at all —
          the approved design is a single banner — so there is nothing here to
          contradict by collecting them at the bottom instead.

          `bottom-16` and not `bottom-6`: the USP strip is pulled up 48px over
          the hero and carries `z-10`, so the dots were rendering *behind* it.
        */
        <div className="absolute inset-x-0 bottom-16 flex items-center justify-center gap-1">
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => setIndex((i) => advance(i, slides.length, -1))}
            className="grid size-11 place-items-center rounded-full text-ink-inverse hover:bg-ink-inverse/15"
          >
            <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
          </button>

          {slides.map((slide, i) => (
            /*
              The button is the 44px target; the span is the 8px dot the comps
              draw. Growing the dot itself to meet 2.5.8 would have changed the
              design — padding it does not.
            */
            <button
              key={slide.id}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => setIndex(i)}
              className="group grid h-11 place-items-center px-1"
            >
              <span
                className={cn(
                  "block h-2 rounded-full transition-all duration-(--duration-fast)",
                  i === index
                    ? "w-6 bg-gold"
                    : "w-2 bg-ink-inverse/50 group-hover:bg-ink-inverse/80",
                )}
              />
            </button>
          ))}

          <button
            type="button"
            aria-label="Next slide"
            onClick={() => setIndex((i) => advance(i, slides.length, 1))}
            className="grid size-11 place-items-center rounded-full text-ink-inverse hover:bg-ink-inverse/15"
          >
            <ChevronRight size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </section>
  );
}
