import { FeatureItem } from "../content/FeatureGrid.jsx";

/**
 * The USP strip (§10.1) — `FeatureItem` rows in section `HOME_USP`.
 *
 * In the reference this card straddles the bottom edge of the hero rather than
 * sitting below it, which is why it is pulled up by a negative margin and
 * given its own stacking context.
 *
 * The row itself is `FeatureItem`, shared with Quality's commitment grid and
 * the dealer benefits. It lived here until RTPP-67's backend update gave those
 * sections an endpoint to read — one payload, one renderer.
 *
 * The rules between the four are `lg` only, and they are the reason this uses
 * `divide-x` rather than a border on each item: at `sm:grid-cols-2` the third
 * item *starts* a row, and a left border there would draw a line down the
 * middle of nothing. `divide-x` skips the first child, but in a two-column
 * grid the third is not first — so the whole thing waits for the single row.
 */
export function UspStrip({ items }) {
  if (!items?.length) return null;

  return (
    <section aria-label="Why Rajdhani" className="relative z-10 -mt-12 pl-(--gutter-l) pr-(--gutter-r)">
      <ul className="mx-auto grid max-w-(--container-max) gap-6 rounded-xl bg-surface p-6 shadow-modal sm:grid-cols-2 sm:p-8 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-line [&>li]:lg:px-6 [&>li:first-child]:lg:pl-0 [&>li:last-child]:lg:pr-0">
        {items.map((item) => (
          // Tinted, not filled: the reference draws pale mint circles with
          // green glyphs, and all four live items carry the solid brand green
          // — which rendered as four dark discs. See `markStyle`.
          <FeatureItem key={item.id} item={item} tone="tint" />
        ))}
      </ul>
    </section>
  );
}
