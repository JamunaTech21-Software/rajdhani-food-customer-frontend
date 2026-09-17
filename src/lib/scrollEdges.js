/**
 * Whether a horizontal scroller has more content off either edge.
 *
 * The four strips on this site — featured products, the product tabs, the
 * category filter bar, the gallery tabs — all cut their last item off mid-width
 * on a phone, and two of them hide the scrollbar outright. On a touch device
 * there is no scrollbar to see anyway: overlay scrollbars only appear while you
 * are already scrolling, which is after you needed to know.
 *
 * So the strips fade at whichever edge has more behind it, and this is the part
 * that decides which. Pure, because the arithmetic has an off-by-one that is
 * worth a test: a scroller that is exactly at its end reports a `scrollLeft`
 * a fraction under `scrollWidth - clientWidth` on a fractional-pixel display,
 * and a fade that never quite goes away is worse than no fade.
 */

/** Sub-pixel slack, so a fully scrolled strip reads as fully scrolled. */
const EPSILON = 2;

export function scrollEdges({ scrollLeft, scrollWidth, clientWidth } = {}) {
  const left = Number(scrollLeft);
  const total = Number(scrollWidth);
  const visible = Number(clientWidth);

  if (![left, total, visible].every(Number.isFinite)) return { start: false, end: false };

  // Nothing overflows: no fade at either edge, whatever the scroll position
  // claims. A strip that fits is not a strip with more behind it.
  if (total - visible <= EPSILON) return { start: false, end: false };

  // `scrollLeft` is negative at the start in a right-to-left document, so the
  // distance travelled is its magnitude rather than its value.
  const travelled = Math.abs(left);

  return {
    start: travelled > EPSILON,
    end: travelled < total - visible - EPSILON,
  };
}
