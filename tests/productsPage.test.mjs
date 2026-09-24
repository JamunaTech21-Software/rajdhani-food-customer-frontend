import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const read = (path) => readFileSync(fileURLToPath(new URL(`../src/${path}`, import.meta.url)), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const page = strip(read("pages/ProductsPage.jsx"));
const bar = strip(read("components/products/CategoryFilterBar.jsx"));
const router = strip(read("routes/router.jsx"));

test("the listing is reachable at /products", () => {
  assert.match(router, /path: "\/products", element: <ProductsPage \/>/);
});

// ── Criterion 1: a copied URL reproduces the view ─────────────────────────

test("no filter lives in component state", () => {
  // If any part of the filter were held in useState, a copied URL would not
  // reproduce the view — which is the criterion, exactly.
  assert.match(page, /useSearchParams\(\)/);
  assert.match(page, /parseFilters\(searchParams\)/);
  assert.doesNotMatch(page, /useState/, "filter state must live only in the URL");
});

test("the query key is the filter state, so each view caches separately", () => {
  // Keyed on anything less and Back would show the previous filter's results
  // until a refetch landed.
  assert.match(page, /queryKey: \["public", "products", filters\]/);
});

// ── Criterion 2: back/forward moves through filter states ─────────────────

test("a filter change pushes a history entry rather than replacing one", () => {
  // This is the criterion, and it is the opposite of what the dashboard's
  // product list does: there, `{ replace: true }` keeps twenty filter tweaks
  // out of an admin's way. Here, stepping back through them is the point.
  assert.match(page, /setSearchParams\(toSearchParams\(withFilter\(filters, patch\)\)\)/);
  assert.doesNotMatch(page, /replace: true/, "replace would collapse the history");
});

test("every filter control goes through the one update path", () => {
  // A control calling setSearchParams directly would bypass the page-reset and
  // the default-stripping, and produce URLs the parser round-trips differently.
  const calls = page.match(/setSearchParams\(/g) ?? [];
  assert.equal(calls.length, 1, "there should be exactly one writer of the URL");

  for (const control of ["onSelect={(slug) => update({ category: slug })}", "update({ page: filters.page - 1 })", "update({ page: filters.page + 1 })"]) {
    assert.ok(page.includes(control), `missing: ${control}`);
  }
});

// ── The filter bar ────────────────────────────────────────────────────────

test("the bar is driven by Category, with icons", () => {
  assert.match(page, /useCategories\(\)/);
  assert.match(bar, /<Icon name=\{category\.icon_name\}/);
  assert.doesNotMatch(bar, /Premium Tea|Green Tea|Black Tea/, "no category names in code");
});

test("category buttons are toggles, not links to elsewhere", () => {
  // aria-pressed, not aria-current: these change the current listing rather
  // than pointing at another page.
  assert.match(bar, /aria-pressed=\{selected\}/);
  assert.match(bar, /aria-pressed=\{!active\}/, "and All Products is the same control");
  assert.doesNotMatch(bar, /aria-current/);
});

test("the bar scrolls sideways rather than wrapping into rows", () => {
  // Eleven categories wrapped to three rows would push the products themselves
  // off a phone screen.
  assert.match(bar, /overflow-x-auto/);
  assert.match(bar, /whitespace-nowrap/);
});

test("the bar rests under the header, not beneath it", () => {
  assert.match(bar, /sticky top-16 z-30/, "z-30 sits below the header's z-40");
});

// ── States ────────────────────────────────────────────────────────────────

test("an empty result is a message, not an error", () => {
  // The API answers an unknown or empty category with total: 0 and success:
  // true, so this is a normal state that must read as one.
  assert.match(page, /products\.length === 0 \? \(/);
  assert.match(page, /Nothing here yet/);
  assert.match(page, /Show all products/, "and offers a way out of the filter");
});

test("an empty listing reads differently when filtered", () => {
  // "No products yet" on a filtered view would suggest the whole catalogue is
  // empty rather than this one category.
  assert.match(page, /filtered \? "Nothing here yet" : "No products yet"/);
});

test("paging keeps the previous page on screen while loading", () => {
  // Collapsing to a skeleton on every page change jumps the scroll position.
  assert.match(page, /placeholderData: \(previous\) => previous/);
  assert.match(page, /isPlaceholder=\{query\.isPlaceholderData\}/);
});

test("the result count is announced to a screen reader", () => {
  // A sighted user sees the grid change; without this nothing tells anyone else
  // that filtering did anything.
  assert.match(page, /className="sr-only" role="status"/);
  assert.match(page, /\{meta\?\.total \?\? products\.length\} products/);
});

test("the bulk-supply block is content, not hardcoded copy", () => {
  const cta = strip(read("components/products/BulkSupplyCta.jsx"));

  assert.match(page, /placement: "DEALER_CTA"/);
  assert.match(cta, /if \(!banner\) return null/, "and disappears when none is active");
  assert.doesNotMatch(cta, /Looking for Bulk Supply|Become a Distributor/, "no copy in code");
});

test("the grid reuses the card the home page already uses", () => {
  // Building a second product card is how the two drift.
  assert.match(page, /import \{ ProductCard \} from "\.\.\/components\/ProductCard\.jsx"/);
});

test("the catalogue wears the banner an editor can already set", () => {
  // `PRODUCTS_HERO` was in the API's placement enum and offered by the admin's
  // Banners screen, and this page read neither — so a banner could be
  // uploaded, published and returned by the API while the page drew a
  // hand-written heading over it. It is the third placement found in that
  // state; this is the guard so it is not a fourth.
  assert.match(page, /placement: "PRODUCTS_HERO"/);
  assert.match(page, /<PageHero/);

  // The floor under an empty placement, not the heading: a page with no <h1>
  // has no accessible or indexable name.
  assert.match(page, /title=\{activeCategory\?\.name \?\? "Our Products"\}/);

  // A category listing still gets its own name and description, which is the
  // whole reason the admin lets someone write them.
  assert.match(page, /title: activeCategory\.name/);
  assert.match(page, /subtitle: activeCategory\.description/);
});
