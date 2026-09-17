import assert from "node:assert/strict";
import { test } from "node:test";

import { ALL_CATEGORY, captionFor, galleryTabs, isNavigationKey, nextIndex, ratioFor } from "../src/lib/gallery.js";

// The live categories, including one with no images.
const CATEGORIES = [
  { id: "1", name: "Tea Gardens", slug: "tea-gardens", icon_name: "mountain", image_count: 2 },
  { id: "2", name: "Manufacturing", slug: "manufacturing", icon_name: "factory", image_count: 1 },
  { id: "3", name: "Events", slug: "events", icon_name: "calendar", image_count: 0 },
  { id: "4", name: "Team", slug: "team", icon_name: "users", image_count: 1 },
];

test("the tab bar is All plus every category", () => {
  const tabs = galleryTabs(CATEGORIES);

  assert.equal(tabs.length, 5);
  assert.equal(tabs[0], ALL_CATEGORY);
  assert.deepEqual(tabs.slice(1).map((t) => t.slug), ["tea-gardens", "manufacturing", "events", "team"]);
});

test("an empty category keeps its tab", () => {
  // Events has image_count 0 live. Hiding it would make a category an editor
  // created invisible to them until they upload — the same rule the product
  // filter bar follows.
  const events = galleryTabs(CATEGORIES).find((t) => t.slug === "events");

  assert.ok(events, "Events should still have a tab");
  assert.equal(events.count, 0, "and the count says so, so it does not look broken when clicked");
});

test("a category with no slug is dropped rather than linking nowhere", () => {
  const tabs = galleryTabs([{ id: "1", name: "Broken" }, null, CATEGORIES[0]]);
  assert.deepEqual(tabs.slice(1).map((t) => t.name), ["Tea Gardens"]);
});

test("no categories still gives an All tab", () => {
  assert.deepEqual(galleryTabs(null), [ALL_CATEGORY]);
  assert.deepEqual(galleryTabs([]), [ALL_CATEGORY]);
});

// ── Criterion 2: no layout shift ──────────────────────────────────────────

test("every tile has a reserved ratio, with or without dimensions", () => {
  // Without a reserved box every tile below reflows as images arrive.
  for (let i = 0; i < 25; i += 1) {
    assert.match(ratioFor(i), /^\d+ \/ \d+$/, `index ${i} has no usable ratio`);
  }
});

test("the real width and height are used when the payload has them", () => {
  // Added by the backend 2026-09-16. The true shape means nothing is cropped
  // and the reserved box matches the image exactly — better than a guess.
  assert.equal(ratioFor(0, { image: { width: 1200, height: 800 } }), "1200 / 800");
  assert.equal(ratioFor(3, { width: 1000, height: 1000 }), "1000 / 1000", "either shape is accepted");
});

test("nonsense dimensions fall back rather than collapsing the tile", () => {
  // `aspect-ratio: 1200 / 0` collapses the tile to nothing and takes the column
  // layout with it.
  for (const image of [
    { width: 1200, height: 0 },
    { width: 0, height: 800 },
    { width: "wide", height: 800 },
    { width: 1200 },
    null,
  ]) {
    const ratio = ratioFor(0, { image });
    assert.match(ratio, /^\d+ \/ \d+$/, `${JSON.stringify(image)} gave ${ratio}`);
    assert.notEqual(ratio, "1200 / 0");
  }
});

test("the ratio for an index never changes", () => {
  // A random ratio would reshuffle the whole grid on every paint and after each
  // refetch — a layout shift of its own making.
  const first = Array.from({ length: 12 }, (_, i) => ratioFor(i));
  const second = Array.from({ length: 12 }, (_, i) => ratioFor(i));

  assert.deepEqual(first, second);
});

test("the ratios vary, or it is a plain grid rather than masonry", () => {
  const distinct = new Set(Array.from({ length: 12 }, (_, i) => ratioFor(i)));
  assert.ok(distinct.size >= 3, `only ${distinct.size} distinct ratios`);
});

// ── Criterion 1: keyboard operation ───────────────────────────────────────

test("arrows move forward and back", () => {
  assert.equal(nextIndex(0, 4, "ArrowRight"), 1);
  assert.equal(nextIndex(2, 4, "ArrowLeft"), 1);
  // Up and down do the same, since a grid gives no single meaning to vertical.
  assert.equal(nextIndex(0, 4, "ArrowDown"), 1);
  assert.equal(nextIndex(1, 4, "ArrowUp"), 0);
});

test("navigation wraps at both ends", () => {
  // A dead arrow key at the end of a gallery reads as a broken control rather
  // than as an edge, and there is nothing else the key could mean.
  assert.equal(nextIndex(3, 4, "ArrowRight"), 0);
  assert.equal(nextIndex(0, 4, "ArrowLeft"), 3);
});

test("Home and End jump to the ends", () => {
  assert.equal(nextIndex(2, 4, "Home"), 0);
  assert.equal(nextIndex(1, 4, "End"), 3);
});

test("a key with no meaning here leaves the position alone", () => {
  // Otherwise typing would move the image under someone.
  for (const key of ["a", "Enter", " ", "Tab", "Escape"]) {
    assert.equal(nextIndex(2, 4, key), 2, `${key} should not navigate`);
    assert.equal(isNavigationKey(key), false);
  }
});

test("a single image cannot be navigated off", () => {
  assert.equal(nextIndex(0, 1, "ArrowRight"), 0);
  assert.equal(nextIndex(0, 1, "ArrowLeft"), 0);
});

test("an empty or broken gallery does not produce a negative index", () => {
  // A -1 would index past the array and render undefined into the lightbox.
  for (const total of [0, -1, null, undefined, "four"]) {
    assert.equal(nextIndex(0, total, "ArrowLeft"), 0, `total ${total}`);
    assert.equal(nextIndex(0, total, "ArrowRight"), 0);
  }
  assert.equal(nextIndex(null, 4, "ArrowRight"), 1, "a missing current index starts from the first");
});

// ── Captions ──────────────────────────────────────────────────────────────

test("a caption falls back through what is actually populated", () => {
  // `description` is null on every live image and `title` is the useful field.
  assert.equal(captionFor({ title: "Second-flush plucking" }), "Second-flush plucking");
  assert.equal(captionFor({ image: { alt: "Tea Garden" } }), "Tea Garden");
  assert.equal(captionFor({ category: { name: "Manufacturing" } }), "Manufacturing");
  assert.equal(captionFor(null), "Gallery image", "never empty — it is the accessible name");
});
