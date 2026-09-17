import assert from "node:assert/strict";
import { test } from "node:test";

import { advance, swipeIntent } from "../src/lib/carousel.js";
import { scrollEdges } from "../src/lib/scrollEdges.js";

// ── Moving between slides ─────────────────────────────────────────────────

test("a slide moves forward and back", () => {
  assert.equal(advance(0, 4, 1), 1);
  assert.equal(advance(2, 4, -1), 1);
});

test("both ends wrap", () => {
  // A dead arrow at the last slide reads as a broken control rather than as an
  // edge, and there is nothing else the button could mean.
  assert.equal(advance(3, 4, 1), 0);
  assert.equal(advance(0, 4, -1), 3);
});

test("a single slide cannot be moved off", () => {
  assert.equal(advance(0, 1, 1), 0);
  assert.equal(advance(0, 1, -1), 0);
});

test("an empty or broken count never produces a negative index", () => {
  // A -1 would index past the array and render undefined into the hero.
  for (const total of [0, -1, null, undefined, "four", 1.5]) {
    assert.equal(advance(0, total, -1), 0, `total ${total}`);
    assert.equal(advance(0, total, 1), 0);
  }
});

test("an index past the end is brought back inside", () => {
  // Banners can be unpublished while someone is looking at the page.
  assert.equal(advance(9, 3, 1), 1);
  assert.equal(advance(-2, 3, 1), 1);
});

// ── Reading a swipe ───────────────────────────────────────────────────────

test("dragging left shows the next slide", () => {
  // The direction of travel is the opposite of the finger: dragging left
  // reveals what is to the right.
  assert.equal(swipeIntent(-120, 0), "next");
  assert.equal(swipeIntent(120, 0), "previous");
});

test("a tap is not a swipe", () => {
  // Every tap is a drag of two or three pixels. Without a floor, tapping the
  // hero advances it.
  for (const dx of [0, 3, -8, 40, -47]) {
    assert.equal(swipeIntent(dx, 0), null, `${dx}px should not move the slide`);
  }
  assert.equal(swipeIntent(48, 0), "previous", "and the threshold itself does");
});

test("scrolling the page does not change the slide", () => {
  // Someone flicking down past a hero drags mostly vertically, and a few
  // pixels of horizontal wobble should not move what is under their thumb.
  assert.equal(swipeIntent(-60, 200), null);
  assert.equal(swipeIntent(60, -90), null);
  assert.equal(swipeIntent(-90, 60), "next", "a mostly-horizontal drag still counts");
});

test("a diagonal exactly on the line is not a swipe", () => {
  assert.equal(swipeIntent(-80, 80), null);
});

test("nonsense coordinates are ignored rather than thrown on", () => {
  for (const [dx, dy] of [[NaN, 0], [Infinity, 0], [undefined, undefined], ["left", 0]]) {
    assert.equal(swipeIntent(dx, dy), null);
  }
});

test("the threshold can be tuned per surface", () => {
  assert.equal(swipeIntent(-30, 0, { threshold: 20 }), "next");
});

// ── Which edge of a strip has more behind it ──────────────────────────────

const strip = (scrollLeft, scrollWidth, clientWidth) => scrollEdges({ scrollLeft, scrollWidth, clientWidth });

test("a strip that fits fades at neither edge", () => {
  // A permanent fade on a strip with nothing hidden is its own small lie — and
  // these bars often do fit, once there is room for every category.
  assert.deepEqual(strip(0, 400, 400), { start: false, end: false });
  assert.deepEqual(strip(0, 380, 400), { start: false, end: false });
});

test("an unscrolled overflowing strip fades only at the far edge", () => {
  assert.deepEqual(strip(0, 900, 400), { start: false, end: true });
});

test("a fully scrolled strip fades only at the near edge", () => {
  assert.deepEqual(strip(500, 900, 400), { start: true, end: false });
});

test("a strip in the middle fades at both", () => {
  assert.deepEqual(strip(200, 900, 400), { start: true, end: true });
});

test("a fraction of a pixel does not leave a fade that never goes away", () => {
  // On a fractional-pixel display a fully scrolled element reports a
  // scrollLeft a shade under its maximum, and a fade that never clears reads
  // as content that can never be reached.
  assert.equal(strip(499.4, 900, 400).end, false);
  assert.equal(strip(0.6, 900, 400).start, false);
});

test("a right-to-left strip measures distance, not sign", () => {
  // `scrollLeft` counts down from zero in an RTL document.
  assert.deepEqual(strip(-200, 900, 400), { start: true, end: true });
  assert.deepEqual(strip(-500, 900, 400), { start: true, end: false });
});

test("an element that has not been measured yet fades at neither edge", () => {
  // The hook runs before layout on the first pass, and before the API fills
  // the strip at all.
  assert.deepEqual(scrollEdges(), { start: false, end: false });
  assert.deepEqual(scrollEdges({}), { start: false, end: false });
  assert.deepEqual(strip(0, 0, 0), { start: false, end: false });
});
