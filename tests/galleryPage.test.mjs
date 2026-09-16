import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const read = (path) => readFileSync(fileURLToPath(new URL(`../src/${path}`, import.meta.url)), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const page = strip(read("pages/GalleryPage.jsx"));
const grid = strip(read("components/gallery/GalleryGrid.jsx"));
const lightbox = strip(read("components/gallery/Lightbox.jsx"));
const router = strip(read("routes/router.jsx"));

test("both the index and category pages are routed", () => {
  assert.match(router, /path: "\/gallery", element: <GalleryPage \/>/);
  assert.match(router, /path: "\/gallery\/:slug", element: <GalleryPage \/>/);
});

// ── Criterion 1: fully operable by keyboard alone ─────────────────────────

test("every tile is a button, so Tab reaches it and Enter opens it", () => {
  // Half of "operable by keyboard alone" is getting in. A div with onClick is
  // unreachable without a mouse.
  assert.match(grid, /<button\s+type="button"\s+onClick=\{\(\) => onOpen\(index\)\}/);
  assert.match(grid, /<span className="sr-only">View \{caption\}<\/span>/, "and each has a distinct name");
});

test("arrows, Home and End move between images", () => {
  assert.match(lightbox, /isNavigationKey\(event\.key\)/);
  assert.match(lightbox, /nextIndex\(index, total, event\.key\)/);
});

test("the key listener is on the document, not one control", () => {
  // Focus may legitimately sit on the close button or either arrow. Bound to a
  // single element, the arrows would only work from wherever focus happened to
  // land — which is not "operable by keyboard alone".
  assert.match(lightbox, /document\.addEventListener\("keydown", onKeyDown\)/);
  assert.match(lightbox, /document\.removeEventListener\("keydown", onKeyDown\)/, "and is cleaned up");
});

test("navigation keys do not scroll the page behind the dialog", () => {
  assert.match(lightbox, /event\.preventDefault\(\)/);
});

test("Escape, focus trapping and focus return are the dialog's job", () => {
  // Radix returns focus to the exact tile that opened it, so a keyboard user
  // resumes where they were rather than at the top of the page.
  assert.match(lightbox, /@radix-ui\/react-dialog/);
  assert.match(lightbox, /Dialog\.Content/);
  assert.match(lightbox, /Dialog\.Title/, "a dialog without a title is unannounced");
});

test("moving between images is announced, not only shown", () => {
  // The visual "3 / 12" tells a sighted user they moved. Without a live region
  // nothing tells anyone else.
  assert.match(lightbox, /aria-live="polite"/);
  assert.match(lightbox, /Image \{index \+ 1\} of \{total\}/);
});

// ── Criterion 2: lazy-load without layout shift ───────────────────────────

test("every tile reserves its height before the image loads", () => {
  // The payload has no dimensions, so nothing can be measured up front. Without
  // a reserved box, every tile below reflows as images arrive.
  assert.match(grid, /aspectRatio=\{ratioFor\(index\)\}/);
});

test("only the first few tiles load eagerly", () => {
  assert.match(grid, /priority=\{index < 4\}/);
});

test("the loading skeleton reserves the same shape as the grid", () => {
  // A skeleton of a different shape is itself a layout shift when it is
  // replaced by the real thing.
  assert.match(page, /aspectRatio: i % 2 \? "3 \/ 4" : "1 \/ 1"/);
  assert.match(page, /columns-2 gap-4 lg:columns-3 xl:columns-4/);
});

test("tiles are not sliced across column breaks", () => {
  assert.match(grid, /break-inside-avoid/);
});

// ── Tabs and categories ───────────────────────────────────────────────────

test("the tab bar is driven by the API, with no category names in code", () => {
  assert.match(page, /galleryTabs\(categories\.data\?\.items\)/);
  assert.doesNotMatch(page, /Tea Gardens|Manufacturing|Events|Team/);
});

test("selecting a category navigates, so it is a real shareable URL", () => {
  // Also what gives a category its own hero and breadcrumb, per the scope.
  assert.match(page, /navigate\(next \? `\/gallery\/\$\{next\}` : "\/gallery"\)/);
});

test("a category page gets a breadcrumb, the index does not", () => {
  assert.match(page, /\{category \? \(/);
  assert.match(page, /aria-label="Breadcrumb"/);
});

test("the lightbox closes when the category changes", () => {
  // Otherwise it stays open showing an image from the previous category, at an
  // index that no longer means anything.
  assert.match(page, /setLightboxIndex\(null\);\s*\n\s*navigate\(/);
});

test("an empty category says so and offers a way out", () => {
  // Events has image_count 0 live, and its tab is deliberately kept.
  assert.match(page, /Nothing here yet/);
  assert.match(page, /See the whole gallery/);
});

test("captions are visible on focus, not only on hover", () => {
  // A hover-only caption is invisible to anyone navigating by keyboard.
  assert.match(grid, /group-focus-visible:opacity-100/);
});
