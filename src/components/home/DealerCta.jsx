import { ArrowRight, Handshake } from "lucide-react";
import { Link } from "react-router";

import { isExternal } from "../../lib/nav.js";

const ACTION =
  "inline-flex h-12 shrink-0 items-center gap-2 rounded-md bg-surface px-6 text-sm font-medium text-brand transition-colors duration-(--duration-fast) hover:bg-ground";

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
      // No vertical padding of its own, unlike every other band. The bands
      // above and below each carry `py-(--space-section)`, so this sits in one
      // section of space on each side rather than one above and two below —
      // which is what it had, and which pushed the bar visibly off-centre
      // between its neighbours. The reference draws it tighter than the other
      // bands anyway.
      className="mx-auto max-w-(--container-max) pl-(--gutter-l) pr-(--gutter-r)"
    >
      <div className="relative isolate flex flex-col gap-6 overflow-hidden rounded-xl bg-brand px-6 py-8 sm:px-10 lg:flex-row lg:items-center lg:gap-10 lg:pr-64">
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
        */}
        <img
          src="/home-distibutor-right.png"
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="fade-in-from-left absolute inset-y-0 right-0 -z-10 hidden w-[20%] object-cover lg:block"
        />

        <span
          aria-hidden="true"
          className="grid size-16 shrink-0 place-items-center rounded-full bg-surface text-brand"
        >
          <Handshake size={30} strokeWidth={1.75} />
        </span>

        <div className="min-w-0 flex-1">
          <h2
            id="dealer-cta-heading"
            className="font-display text-xl font-bold text-on-brand sm:text-2xl"
          >
            {banner.title}
            {banner.title_highlight ? (
              // The gold rather than a lighter green: on a solid brand bar a
              // tint of the same hue is not a highlight, it is a smudge.
              <span className="text-gold"> {banner.title_highlight}</span>
            ) : null}
          </h2>

          {banner.subtitle ? (
            <p className="mt-2 max-w-xl leading-relaxed text-on-brand/85">{banner.subtitle}</p>
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
