import { ArrowRight, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router";

import { CloudinaryImage } from "../CloudinaryImage.jsx";
import { cn } from "../../lib/cn.js";
import { advance, swipeIntent } from "../../lib/carousel.js";
import { SIZES } from "../../lib/cloudinary.js";
import { isExternal } from "../../lib/nav.js";

function Cta({ label, url, onClick, busy = false, variant = "primary", download = false }) {
  if (!label || (!url && !onClick)) return null;

  const className = cn(
    "inline-flex h-12 items-center gap-2 rounded-md px-6 text-sm font-medium transition-colors duration-(--duration-fast)",
    variant === "primary"
      ? "bg-brand text-on-brand hover:bg-brand-dark"
      : // A solid white button with a border and dark text, as the reference
        // draws "Download Catalogue" — not the translucent one it was, which
        // only worked because the hero used to be darkened.
        "border border-line-strong bg-surface text-ink hover:border-brand hover:text-brand",
  );

  // A download gets a download glyph rather than an arrow: the reference puts
  // "Download Catalogue" beside "Explore Our Products", and the two should not
  // look like the same kind of action. Passed explicitly rather than sniffed
  // from the path, because a resolved download's URL is on Cloudinary and
  // looks nothing like `/downloads/…`.
  const Glyph = download || /^\/downloads\//.test(url) ? Download : ArrowRight;

  const content = (
    <>
      {label}
      <Glyph size={16} strokeWidth={2} aria-hidden="true" />
    </>
  );

  // A button, because building the file *is* the action — there is no URL to
  // link at. `aria-busy` rather than `disabled`: a disabled control loses
  // focus mid-interaction, which drops a keyboard user out of the hero.
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-busy={busy || undefined} className={className}>
        {content}
      </button>
    );
  }

  if (isExternal(url)) {
    return (
      // A new tab for a real file, as the product page's brochure link does: a
      // PDF replacing the page a visitor was reading loses their place, and
      // Back from a downloaded file does not always return them.
      <a
        href={url}
        {...(download ? { target: "_blank", rel: "noopener noreferrer" } : null)}
        className={className}
      >
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

/**
 * The second button beside "Explore Our Tea" — the reference's "Download
 * Catalogue".
 *
 * **It always renders, and it always reads "Download Catalogue"** unless an
 * editor has written something else. The reference draws two buttons with that
 * wording, and a hero with one looks unbalanced.
 *
 * Two sources:
 *
 *   1. **The banner's own `secondary_cta_*` pair.** An editor who has written
 *      one means it, and it beats anything decided here.
 *   2. **The CSV** — every published product, built in the browser on the
 *      click and saved as a file.
 *
 * Earlier passes pointed this at an uploaded PDF (`product_catalogue`) and
 * then, when no such file existed, at `/products`. Generating the file removes
 * both compromises: the button now does exactly what it says, with nothing for
 * anyone to upload first.
 */
function secondaryCta(banner, onDownload, busy) {
  if (banner.secondary_cta_label && banner.secondary_cta_url) {
    return { label: banner.secondary_cta_label, url: banner.secondary_cta_url, download: false };
  }

  return { label: "Download Catalogue", onClick: onDownload, busy, download: true };
}

/**
 * How strongly the left of the photograph is lightened behind the headline.
 *
 * **The reference has no dark scrim.** The headline is near-black on a bright
 * photograph, which is a better-looking hero and a more fragile one: with the
 * old full-bleed `bg-ink` gone, legibility stopped being something the code
 * guaranteed and became a property of whatever an editor last uploaded. A dark
 * photograph plus dark text is an AA failure nobody would notice until it was
 * live.
 *
 * So the scrim is not removed, it is **inverted and localised** — a light
 * wash fading left to right, behind the text only, leaving the product shot on
 * the right untouched. That is what the reference's own photograph happens to
 * provide (a pale, misty left third); doing it in CSS means every future
 * upload gets it too.
 *
 * `overlay_opacity` still drives it, so the admin's slider still means
 * something — now "how much protection does this image need" rather than "how
 * dark". **With a floor**, because the one thing the slider must not be able
 * to do is make the headline unreadable. An editor may add protection; they
 * may not remove it.
 */
const MINIMUM_PROTECTION = 0.8;

/** How opaque that wash is, floor included. */
const protection = (overlayOpacity) =>
  Math.max(MINIMUM_PROTECTION, Math.min(Math.max(overlayOpacity ?? 40, 0), 100) / 100);

function Slide({ banner, onDownload, downloading, priority }) {
  const image = banner.desktop_image;

  return (
    // `--hero-min` caps 32rem against the viewport height, so a phone held
    // sideways can still show one whole slide. See index.css.
    <div className="relative isolate flex min-h-(--hero-min) flex-col overflow-hidden lg:block">
      {image?.url ? (
        /*
          A band under the text on a phone; the backdrop behind it at `lg`.
          **Not a styling preference — the arithmetic leaves no other option.**

          The banner is 1983×793, a 2.5:1 strip, and the product group — packet,
          cups, gold seal — runs from 53% to 92% of its width. As a full-bleed
          backdrop the box is 390×480 on a phone, so `object-cover` scales to
          the *height* and crops the width to 32%. A 39%-wide subject does not
          fit in a 32% window at any `object-position`: centred, 34% of the
          product is in frame, and that is the sliver of packet edge the site
          has been showing. At 1280 the same image shows 94% of its width and
          all of the product, which is why this only looks broken on a phone.

          So the box changes shape instead. 390×224 shows 70% of the width, and
          anchored at 75% that window is 23%..92% — the whole product group,
          and the hills it stands in.

          `object-center` returns at `lg`, where the full width is nearly all
          visible and the anchor would only push the composition off-centre.
        */
        <div className="order-last h-56 w-full shrink-0 lg:absolute lg:inset-0 lg:-z-10 lg:order-none lg:h-auto">
          <CloudinaryImage
            src={image.url}
            alt={image.alt ?? ""}
            sizes={SIZES.full}
            priority={priority}
            className="size-full object-[75%_center] lg:object-center"
          />
        </div>
      ) : (
        // No image: a pale ground rather than the deep green it used to be,
        // because the text on top is now dark.
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-ground" />
      )}

      {/*
        A left-to-right wash only where there is room for one.

        The gradient reaches `transparent` at 68% of the *viewport*, which
        works while the text occupies the left half and fails the moment it
        does not. The text column is `max-w-xl`, 576px, so it clears 68% only
        above about 1050px wide: at 768 it runs to 78% and on a phone to 96%,
        and the last third of every line was sitting on the photograph with
        no protection under it at all. Near-black type on a sunlit hillside —
        the first thing anyone sees on a phone, and unreadable.

        Below `lg` there is now no wash at all, because there is nothing to
        protect the text from: the photograph moved out from behind it into a
        band of its own. A flat 80% wash over the whole slide was the previous
        answer, and it worked — it just spent the photograph to buy
        legibility, which is a poor trade once the two need not overlap.
      */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 hidden lg:block lg:bg-gradient-to-r lg:from-surface lg:from-0% lg:via-surface/60 lg:via-35% lg:to-transparent lg:to-68%"
        style={{ opacity: protection(banner.overlay_opacity) }}
      />

      <div className="mx-auto flex w-full max-w-(--container-max) flex-1 flex-col justify-center py-12 pl-(--gutter-l) pr-(--gutter-r) lg:h-full lg:flex-none lg:py-20">
        <div className="max-w-xl">
          {banner.eyebrow_text ? (
            <p className="text-eyebrow font-semibold uppercase tracking-[0.2em] text-brand">
              {banner.eyebrow_text}
            </p>
          ) : null}

          {/*
            Two lines: the plain half in near-black and the highlighted half in
            the brand green, which is how the reference sets "Pure Nature /
            Perfect Taste". It was white over gold, which only read because the
            image behind it was darkened.
          */}
          {banner.title || banner.title_highlight ? (
            <h1 className="mt-3 font-display text-4xl font-bold leading-[1.1] text-ink sm:text-5xl lg:text-6xl">
              {banner.title ? <span className="block">{banner.title}</span> : null}
              {banner.title_highlight ? (
                <span className="block text-brand">{banner.title_highlight}</span>
              ) : null}
            </h1>
          ) : null}

          {banner.subtitle ? (
            <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-muted sm:text-lg">
              {banner.subtitle}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <Cta label={banner.primary_cta_label} url={banner.primary_cta_url} />
            <Cta {...secondaryCta(banner, onDownload, downloading)} variant="secondary" />
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
export function Hero({ banners, onDownload, downloading = false }) {
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
      <Slide banner={current} onDownload={onDownload} downloading={downloading} priority />

      {many ? (
        /*
          One control row rather than arrows floating at the sides.

          The side arrows sat at `top-1/2` over a headline that is full-width on
          a phone, so on the screens where they mattered most they covered the
          thing they were pointing at. The comps show no hero controls at all —
          the approved design is a single banner — so there is nothing here to
          contradict by collecting them at the bottom instead.

          The offset is 64px rather than the 24px it started at: the USP strip
          is pulled up 48px over the hero and carries `z-10`, so at the
          smaller value the dots were rendering *behind* it.
        */
        <div className="absolute inset-x-0 bottom-16 flex items-center justify-center gap-1">
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => setIndex((i) => advance(i, slides.length, -1))}
            className="grid size-11 place-items-center rounded-full text-ink hover:bg-ink/10"
          >
            <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
          </button>

          {slides.map((slide, i) => (
            /*
              The span is the 8px dot the comps draw; the button is the target
              around it. Growing the dot itself to meet 2.5.8 would have
              changed the design — padding it does not.

              24×44, and the width is the part that was wrong: this claimed a
              44px target and was 44px tall by 16px wide, which fails 2.5.8
              outright, and the 4px gap is too small for its spacing
              exemption to rescue. `w-6` meets the 24px minimum without
              spreading the dots the way a 44px-wide target would. See
              `Testimonials`, which had the same bug.
            */
            <button
              key={slide.id}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => setIndex(i)}
              className="group grid h-11 w-6 place-items-center"
            >
              <span
                className={cn(
                  "block h-2 rounded-full transition-all duration-(--duration-fast)",
                  i === index
                    ? "w-6 bg-brand"
                    : "w-2 bg-ink/35 group-hover:bg-ink/70",
                )}
              />
            </button>
          ))}

          <button
            type="button"
            aria-label="Next slide"
            onClick={() => setIndex((i) => advance(i, slides.length, 1))}
            className="grid size-11 place-items-center rounded-full text-ink hover:bg-ink/10"
          >
            <ChevronRight size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </section>
  );
}
