import { ArrowRight, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { CloudinaryImage } from "../CloudinaryImage.jsx";
import { cn } from "../../lib/cn.js";
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
    <div className="relative isolate min-h-[32rem] overflow-hidden lg:min-h-[38rem]">
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

      <div className="mx-auto flex h-full max-w-[1280px] flex-col justify-center px-4 py-20 sm:px-6">
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

  if (slides.length === 0) return null;

  const many = slides.length > 1;
  const current = slides[Math.min(index, slides.length - 1)];

  return (
    <section aria-label="Highlights" className="relative">
      <Slide banner={current} priority />

      {many ? (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto flex max-w-[1280px] -translate-y-1/2 justify-between px-2 sm:px-4">
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
              className="pointer-events-auto grid size-10 place-items-center rounded-full bg-surface/85 text-ink shadow-card hover:bg-surface"
            >
              <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => setIndex((i) => (i + 1) % slides.length)}
              className="pointer-events-auto grid size-10 place-items-center rounded-full bg-surface/85 text-ink shadow-card hover:bg-surface"
            >
              <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>

          <div className="absolute inset-x-0 bottom-6 flex justify-center gap-2">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-2 rounded-full transition-all duration-(--duration-fast)",
                  i === index ? "w-6 bg-gold" : "w-2 bg-ink-inverse/50 hover:bg-ink-inverse/80",
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
