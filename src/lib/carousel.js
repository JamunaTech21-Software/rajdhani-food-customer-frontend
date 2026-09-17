/**
 * Moving between slides, and reading a swipe.
 *
 * Pure, so the awkward parts — wrapping at both ends, and deciding whether a
 * drag was a swipe at all — are testable without a touchscreen.
 */

/**
 * The slide `step` places away, wrapping at both ends.
 *
 * A dead arrow at the last slide reads as a broken control rather than as an
 * edge, and there is nothing else the button could mean.
 */
export function advance(index, total, step) {
  const count = Number.isInteger(total) && total > 0 ? total : 0;
  if (count === 0) return 0;

  const from = Number.isInteger(index) && index >= 0 ? index % count : 0;
  return (((from + step) % count) + count) % count;
}

/**
 * What a pointer drag meant, or null if it meant nothing.
 *
 * Two judgements, both of which get carousels wrong when skipped:
 *
 *   * **Horizontal dominance.** Someone scrolling the page down past a hero
 *     drags mostly vertically, and a few pixels of horizontal wobble should not
 *     change the slide under them.
 *   * **A threshold.** Every tap is a drag of two or three pixels. Without a
 *     floor, tapping the hero advances it.
 *
 * Dragging left (a negative dx) reveals what is to the right, which is the
 * *next* slide — the direction of travel is the opposite of the finger.
 */
export function swipeIntent(dx, dy, { threshold = 48 } = {}) {
  const x = Number(dx);
  const y = Number(dy);

  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (Math.abs(x) < threshold) return null;
  if (Math.abs(x) <= Math.abs(y)) return null;

  return x < 0 ? "next" : "previous";
}
