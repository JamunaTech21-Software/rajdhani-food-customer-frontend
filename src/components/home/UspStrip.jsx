import { FeatureItem } from "../content/FeatureGrid.jsx";

/**
 * The USP strip (§10.1) — `FeatureItem` rows in section `HOME_USP`.
 *
 * In the approved comp this card straddles the bottom edge of the hero rather
 * than sitting below it, which is why it is pulled up by a negative margin and
 * given its own stacking context.
 *
 * The row itself is `FeatureItem`, shared with Quality's commitment grid and
 * the dealer benefits. It lived here until RTPP-67's backend update gave those
 * sections an endpoint to read — one payload, one renderer.
 */
export function UspStrip({ items }) {
  if (!items?.length) return null;

  return (
    <section aria-label="Why Rajdhani" className="relative z-10 -mt-12 pl-(--gutter-l) pr-(--gutter-r)">
      <ul className="mx-auto grid max-w-(--container-max) gap-6 rounded-xl bg-surface p-6 shadow-modal sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
        {items.map((item) => (
          <FeatureItem key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}
