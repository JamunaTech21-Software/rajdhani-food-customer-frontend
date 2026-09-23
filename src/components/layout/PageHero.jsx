import { Link } from "react-router";

import { CloudinaryImage } from "../CloudinaryImage.jsx";
import { Ornament } from "../content/Ornament.jsx";
import { SIZES } from "../../lib/cloudinary.js";

/**
 * How dark the left of the banner is, with a floor.
 *
 * The same argument as the home hero's `MINIMUM_PROTECTION`, and here it is
 * load-bearing: this heading is white, over whatever photograph an editor
 * last uploaded, and `overlay_opacity` on the live About row is 40 — which
 * rendered "About Us" in white on a sunlit hillside.
 *
 * The comp's own left edge samples #0a1612 against a photograph that is about
 * #4a6a40 underneath, so roughly 85% coverage. That is the floor. An editor
 * may still add protection for a brighter image; they may not take it below
 * the point where the text stops being readable.
 */
const MINIMUM_PROTECTION = 0.85;

/**
 * The inner-page banner: image, heading, breadcrumb, subtitle.
 *
 * Every page below the home page wears this in the comps — Contact first, then
 * About, Quality, Gallery and News — so it is one component rather than one per
 * page. The home hero is deliberately not this: it is full-height and carries
 * CTAs, which is a different thing that happens to look similar.
 *
 * `title` is a fallback, not content. The heading, eyebrow, subtitle and image
 * all come from the banner an editor placed at this placement; `title` only
 * covers the window before one exists, because a page with no `<h1>` is a page
 * with no accessible or indexable name. Everything an editor sets wins over it.
 */
export function PageHero({ banner, title, breadcrumb, lead, ornament = false }) {
  const overlay = Math.max(
    MINIMUM_PROTECTION,
    Math.min(Math.max(banner?.overlay_opacity ?? 55, 0), 100) / 100,
  );
  const heading = banner?.title || title;

  return (
    <section aria-label={heading} className="relative isolate overflow-hidden">
      {banner?.desktop_image?.url ? (
        <CloudinaryImage
          src={banner.desktop_image.url}
          alt={banner.desktop_image.alt ?? ""}
          sizes={SIZES.full}
          priority
          className="absolute inset-0 -z-10 size-full"
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-brand-deep" />
      )}
      {/*
        A left-to-right scrim, not a flat one.

        The flat `bg-ink` darkened the whole photograph evenly, which is the
        safe way to guarantee contrast and throws the picture away to get it.
        Sampling the comp's banner across its width: #0a1612 at the left edge,
        #1a2d18 at 300, #807b47 at 600, #a3ab02 at 750 — the text sits on near
        black and the tea garden is at full brightness by two thirds across.

        Same shape as the home hero's wash and the same reason, inverted:
        there the page is light and the wash is white, here the page is dark
        and the scrim is ink. Both protect the text and leave the photograph
        alone where nothing is written on it.

        `overlay_opacity` still scales it, so the admin's slider still means
        something.

        **Flat below `lg`, for the reason the home hero records at length.** A
        gradient that clears at 72% of the viewport protects the text only
        while the text is in the left two thirds. The column is `max-w-xl`,
        so on a phone it runs the full width, and the browser showed exactly
        that: "the trust of millions" sitting on bright sky at 390. The same
        mistake twice in two components is what makes it worth a rule — a
        horizontal scrim is a desktop device, and needs a breakpoint.
      */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-ink/75 lg:bg-transparent lg:bg-gradient-to-r lg:from-ink lg:from-0% lg:via-ink/75 lg:via-35% lg:to-transparent lg:to-72%"
        style={{ opacity: overlay }}
      />

      <div className="mx-auto flex max-w-(--container-max) flex-col pb-12 pt-12 lg:pb-16 lg:pt-16 pl-(--gutter-l) pr-(--gutter-r)">
        <div className="max-w-xl">
          {banner?.eyebrow_text ? (
            <p className="text-eyebrow font-semibold uppercase tracking-[0.2em] text-gold">
              {banner.eyebrow_text}
            </p>
          ) : null}

          <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-ink-inverse sm:text-4xl lg:text-5xl">
            {heading}
            {banner?.title_highlight ? (
              <span className="block text-gold">{banner.title_highlight}</span>
            ) : null}
          </h1>

          {/*
            The breadcrumb reads as a line of text under the heading, which is
            where the comp puts it — "Home » About Us", the link in a light
            green with an underline, the current page in white.

            It used to be a white chip pinned to the bottom-right corner,
            hanging a section of margin out of the band and square-bottomed so
            that it read as a tab. That was a different design's idea; this
            one wants the three lines as one left-aligned block, and the chip
            also put the page's own name as far from its heading as the banner
            allows.

            Still a `nav` with an `ol` and `aria-current`, because what
            changed is where it sits, not what it is. The word "Home" rather
            than a house glyph: the comp spells it, and a one-icon breadcrumb
            is a link whose name a screen reader has to be told separately.
          */}
          {breadcrumb ? (
            <nav aria-label="Breadcrumb" className="mt-3">
              <ol className="flex flex-wrap items-center gap-x-2 text-base text-ink-inverse">
                <li>
                  <Link
                    to="/"
                    className="text-brand-tint underline underline-offset-4 transition-colors hover:text-ink-inverse"
                  >
                    Home
                  </Link>
                </li>
                <li aria-hidden="true" className="text-ink-inverse/70">
                  &raquo;
                </li>
                <li aria-current="page" className="font-semibold">
                  {breadcrumb}
                </li>
              </ol>
            </nav>
          ) : null}

          {/*
            The flourish separates the heading from the last paragraph, so
            where it sits depends on how many paragraphs there are. Quality
            draws subtitle → flourish → lead; Gallery has one paragraph and
            draws heading → flourish → paragraph. One rule, both comps: it
            goes immediately above whatever the final paragraph is.
          */}
          {ornament && !lead ? <Ornament className="mt-5" /> : null}

          {banner?.subtitle ? (
            <p className="mt-5 text-base leading-snug text-ink-inverse/90 sm:text-lg">
              {banner.subtitle}
            </p>
          ) : null}

          {/*
            The Quality comp's gold flourish between the banner's two
            paragraphs, and the second paragraph under it.

            Both are opt-in: the other five pages wearing this banner draw one
            paragraph and no ornament, and a divider that appears on a page
            with nothing under it is a rule hanging in space. `lead` is a prop
            rather than a second banner column because `PublicBanner` has one
            `subtitle` — the API decides what a banner holds, not this.

            `aria-hidden` and no text: it is punctuation between two
            paragraphs, and a screen reader announcing a leaf between them is
            noise.
          */}
          {ornament && lead ? <Ornament className="mt-6" /> : null}

          {lead ? (
            <p className="mt-5 text-sm leading-relaxed text-ink-inverse/85 sm:text-base">{lead}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
