import { cn } from "../../lib/cn.js";

/**
 * The watercolour leaf art the comps set in the margin beside a section's
 * content (A7).
 *
 * The parent must be `relative isolate overflow-hidden`. `isolate` is not
 * optional: see the blend note below.
 *
 * ## Why `mix-blend-multiply`
 *
 * Both files — `about-us-our-company-left.png` and
 * `about-us-our-foundation-right-side.png` — are PNG **colour type 2: RGB, no
 * alpha channel**. They are not transparent overlays of leaves; they are
 * opaque near-white rectangles with leaves painted on them. Dropped on a
 * section as-is, each one covers whatever the section's background was with
 * its own patch of white, and the seam where that patch ends is visible on any
 * band that is not pure white.
 *
 * Multiply is `base × overlay`, so the artwork's white areas leave the section
 * exactly as it was and only the leaf pixels darken it. The leaves pick up the
 * band's own colour instead of bringing their own. `isolate` on the parent
 * keeps that blend inside the section rather than letting it reach the page
 * behind it.
 *
 * The same treatment is on the home page's About band, for the same reason.
 * If these assets are ever re-cut with real transparency, the multiply can go
 * and the opacity alone will do.
 *
 * ## Why the width is a `calc`
 *
 * Measured off the About comp: the Our Company sprig runs x 0..68 of a
 * 1024-wide frame and the text column starts at x=80, so the art sits in the
 * margin *outside* the content and stops short of the words. Our container is
 * capped at 1280 with a 24px gutter, so that margin only exists above 1280 —
 * below it, a fixed width would put leaves under the first line of every
 * paragraph.
 *
 * `(100vw - min(100vw, 1280px)) / 2` is exactly that outside margin, and the
 * rem on top is how far the art is allowed to reach back in. So it grows into
 * the space as the screen widens instead of drifting across the text, which is
 * the same measurement `ProcessBand` uses for its photograph.
 *
 * Hidden below `lg`. There is no margin to sit in at those widths and the
 * comps do not draw it there.
 */
export function LeafWatermark({ src, side = "left", align = "top" }) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      className={cn(
        // No `h-full`, unlike ProcessBand's photograph: that one is a panel
        // filling the band, this one is a sprig at its natural proportions.
        // Height comes from the width and the intrinsic ratio, and no `bottom`
        // is set, so there is nothing for the browser to over-constrain.
        "pointer-events-none absolute -z-10 hidden opacity-65 mix-blend-multiply lg:block",
        "lg:w-[calc((100vw-min(100vw,1280px))/2+9rem)] xl:w-[calc((100vw-min(100vw,1280px))/2+12rem)]",
        side === "right" ? "right-0" : "left-0",
        // Where each sits in the comp: Our Company's sprig starts with the
        // band (y 315 against a band opening at 300) while the Foundations one
        // is level with the cards (y 643..773 in a band of 600..863).
        align === "middle" ? "top-1/2 -translate-y-1/2" : "top-0",
      )}
    />
  );
}
