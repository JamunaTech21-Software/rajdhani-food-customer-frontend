import { ArrowRight, Handshake } from "lucide-react";
import { Link } from "react-router";

import { isExternal } from "../../lib/nav.js";

// 44px, not the comp's 39px. Measuring the bar put the button at 131×39, and
// 39 is below the 44px target WCAG 2.5.5 asks for — `responsive.test.mjs`
// enforces that floor and would fail a smaller one. `h-11` is as close to the
// reference as the accessibility budget allows; the width lands at ~137
// against the comp's 131 on its own.
const ACTION =
  "inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-surface px-6 text-sm font-medium text-brand transition-colors duration-(--duration-fast) hover:bg-ground";

/**
 * "Become Our Distributor / Dealer" (§10.1) — the `DEALER_CTA` banner.
 *
 * **The same banner `BulkSupplyCta` draws on `/products`, and deliberately not
 * the same component.** That one is a pale card with the banner's image on one
 * side; the reference wants a solid brand bar with a round mark and one button
 * hard right. Giving `BulkSupplyCta` a variant would mean every later change to
 * the catalogue's block having to reason about the home page's, and the thing
 * the two genuinely share is the *payload* — one banner row, edited once,
 * appearing in two places that look different on purpose.
 *
 * Content-driven, so the copy and the link are editable without a deploy.
 * Renders nothing when no banner is active, which is also how it respects the
 * banner's schedule: the API does not return one outside its
 * `starts_at`/`ends_at` window.
 *
 * The handshake is **decoration, not data** — the banner carries no icon field,
 * and this band is one fixed thing rather than a list of varying ones. It is
 * `aria-hidden` for that reason.
 */
export function DealerCta({ banner }) {
  if (!banner?.title) return null;

  const label = banner.primary_cta_label;
  const url = banner.primary_cta_url;

  const action = !label || !url ? null : (
    <>
      {label}
      <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
    </>
  );

  return (
    <section
      aria-labelledby="dealer-cta-heading"
      // No vertical padding of its own, unlike every other band: the space
      // around it belongs to its neighbours.
      //
      // Above, that is now `ProcessBand`'s `pb-6` — 24px, the comp's figure —
      // because the comp draws the bar's top edge on the same line as the
      // process photograph's bottom edge, and the two read as one
      // composition. Below, it is the quotes band's own
      // `py-(--space-section)`.
      //
      // So it is deliberately no longer centred between the two. It used to
      // be, which was right when nothing above it reached down to meet it;
      // now the join is the thing being drawn. The comp is tighter still
      // underneath — 24px there too — but that is the quotes band's rhythm to
      // give up, not this one's, and §H9 settled that number for every band
      // on the page.
      className="mx-auto max-w-(--container-max) pl-(--gutter-l) pr-(--gutter-r)"
    >
      {/*
        Measured off the comp at 1280-equivalent: the bar is 95px tall with
        14px of padding, 33px in from its left edge, and 30px between the mark
        and the text. It was 148px here, which is half as tall again — the
        `py-8` and a text block set two sizes too large.

        The tightening is held back to `lg`. Below that the bar is a column:
        mark, then text, then button stacked, and 14px of padding around a
        three-item stack reads as cramped rather than as the reference's neat
        row. The comp only ever draws the row.

        The mark stays at 64px. The comp's is 65px — the one part of the left
        side that was already right, which is worth recording because it
        looked too big next to everything else that was.
      */}
      <div className="relative isolate flex flex-col gap-6 overflow-hidden rounded-xl bg-brand px-6 py-6 sm:px-8 lg:flex-row lg:items-center lg:gap-8 lg:py-3.5 lg:pr-64">
        {/*
          The leaves at the right end of the bar, as the reference draws them.
          The file is the whole bar background — flat green on the left, leaves
          on the right — but the two shapes are nothing alike: the bar is about
          9.6:1 and the image 1.56:1, so stretching it across would crop to a
          16% horizontal sliver and turn the leaves into mush.

          Instead it occupies the right 20%. Narrower is better on *both*
          counts here, which is not obvious: below about 22% the scale is set
          by the box's width rather than its height, so **more** of the leaf
          survives, not less. At 36% the leaves covered a fifth of the bar and
          only 45% of each leaf was in frame; at 20% they cover the right
          eighth — where the reference has them — and 81% of the leaf shows.

          `fade-in-from-left` does a second job here beyond softening the edge:
          the image's own green and `--color-brand` are not the same green, and
          the fade means they never have to be. A hard join would show a seam
          the day someone changes `primary_color`.

          `bg-brand` stays underneath as the real background — this is
          decoration over it, not a replacement for it.

          `h-full` for the reason `ProcessBand` records at length: an
          absolutely positioned image with a width and no height takes its
          height from the intrinsic ratio, and the browser then ignores
          `bottom`. This one was 157px against a bar about 148px tall, so it
          very nearly worked by accident — which is worse than obviously
          broken, because it would have started failing the day the copy
          wrapped onto another line.
        */}
        <img
          src="/home-distibutor-right.png"
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="fade-in-from-left absolute inset-y-0 right-0 -z-10 hidden h-full w-[20%] object-cover lg:block"
        />

        <span
          aria-hidden="true"
          className="grid size-16 shrink-0 place-items-center rounded-full bg-surface text-brand"
        >
          <Handshake size={30} strokeWidth={1.75} />
        </span>

        <div className="min-w-0 flex-1">
          {/* 20px at every width. The `sm` step to 24px put the heading a
              size above the comp, which sets "Become Our Distributor /
              Dealer" at about 19–20px — measured from its 294px width in the
              display serif, not from the ink height, since the slash makes
              the tallest glyph taller than the caps. */}
          <h2 id="dealer-cta-heading" className="font-display text-xl font-bold text-on-brand">
            {banner.title}
            {banner.title_highlight ? (
              // The gold rather than a lighter green: on a solid brand bar a
              // tint of the same hue is not a highlight, it is a smudge.
              <span className="text-gold"> {banner.title_highlight}</span>
            ) : null}
          </h2>

          {banner.subtitle ? (
            // 14px on a 20px line, and only 4px under the heading. The comp's
            // subtitle lines sit 20px apart and its first line starts 4px
            // below the title's line box; at 16px with relaxed leading ours
            // was 26px apart, which is what made the block two sizes too tall.
            <p className="mt-1 max-w-xl text-sm text-on-brand/85">{banner.subtitle}</p>
          ) : null}
        </div>

        {action ? (
          isExternal(url) ? (
            <a href={url} className={ACTION}>
              {action}
            </a>
          ) : (
            <Link to={url} className={ACTION}>
              {action}
            </Link>
          )
        ) : null}
      </div>
    </section>
  );
}
