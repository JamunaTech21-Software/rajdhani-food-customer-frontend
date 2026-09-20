import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const read = (path) => readFileSync(fileURLToPath(new URL(`../src/${path}`, import.meta.url)), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const page = strip(read("pages/ProductDetailPage.jsx"));
const panel = strip(read("components/product/BuyPanel.jsx"));
const tabs = strip(read("components/product/ProductTabs.jsx"));
const gallery = strip(read("components/product/Gallery.jsx"));
const router = strip(read("routes/router.jsx"));

test("the page is reachable at /products/:slug", () => {
  assert.match(router, /path: "\/products\/:slug", element: <ProductDetailPage \/>/);
});

// ── Criterion: switching pack size updates every dependent field ──────────

test("every priced field comes from one derivation", () => {
  // The failure guarded against is a price that moves while the SKU beside it
  // does not. One call means it cannot go half done.
  assert.match(panel, /const details = packDetails\(pack\)/);

  for (const field of ["details.sku", "details.price", "details.comparePrice", "details.discountPercent", "details.includesVat"]) {
    assert.ok(panel.includes(field), `${field} is never rendered`);
  }
});

test("the SKU shown is the selected pack's, not the product's", () => {
  // §10.2 is explicit, and the live data confirms it matters: RCB-250 and
  // RCB-500 are different SKUs on the same product.
  assert.match(panel, /SKU: <span className="font-mono text-ink">\{details\.sku\}/);
  assert.doesNotMatch(panel, /product\.sku/);
});

test("selecting a pack is the page's state, so no reload is involved", () => {
  assert.match(panel, /onClick=\{\(\) => onSelectPack\(size\)\}/);
  assert.match(page, /onSelectPack=\{setPack\}/);
});

test("the selection resets when the product changes", () => {
  // Navigating between products must not leave the previous one's pack
  // selected — and an effect would show a frame of it first.
  assert.match(page, /if \(data && seededFor !== data\.id\)/);
  assert.match(page, /setPack\(defaultPackSize\(data\.pack_sizes\)\)/);
});

test("an unavailable pack is struck through, not merely dimmed", () => {
  // "Unavailable" and "not selected" must not look like the same state.
  assert.match(panel, /line-through opacity-50/);
  assert.match(panel, /disabled=\{!available\}/);
});

// ── Criterion: empty tabs hidden ──────────────────────────────────────────

test("the tab strip renders only what visibleTabs returns", () => {
  // The criterion is tested against that function directly; this asserts the
  // component cannot reintroduce a fixed list.
  assert.match(page, /visibleTabs\(data, \{ reviewCount: data\.rating_count \}\)/);
  assert.doesNotMatch(tabs, /Ingredients|Nutrition|Brewing Guide|Packaging/, "no tab names in the component");
});

test("the tab strip is a real tablist, with arrow-key movement", () => {
  // Unlike the header's Products menu, this *is* an application widget rather
  // than navigation, so the tab pattern is the correct one here.
  assert.match(tabs, /role="tablist"/);
  assert.match(tabs, /role="tab"/);
  assert.match(tabs, /role="tabpanel"/);
  assert.match(tabs, /aria-selected=\{i === active\}/);
  assert.match(tabs, /tabIndex=\{i === active \? 0 : -1\}/, "only the selected tab is in the tab order");
  assert.match(tabs, /ArrowRight|ArrowLeft/);
});

// ── Gallery ───────────────────────────────────────────────────────────────

test("the gallery has thumbnails, arrows and a lightbox", () => {
  assert.match(gallery, /aria-label="Previous image"/);
  assert.match(gallery, /aria-label="Next image"/);
  assert.match(gallery, /aria-label="View larger image"/);
  assert.match(gallery, /Dialog\.Content/, "the lightbox traps focus");
});

test("gallery controls only exist when there is more than one image", () => {
  // Live data has products with a single image and one with none at all.
  assert.match(gallery, /const many = shots\.length > 1/);
  assert.match(gallery, /\{many \? \(/);
});

test("product images are contained, not cropped", () => {
  // These are pack shots. object-cover would slice the edges off a packet.
  assert.match(gallery, /imgClassName="object-contain"/);
});

// ── Brochure, share, wishlist ─────────────────────────────────────────────

test("the brochure button is hidden unless the download resolves", () => {
  // No download rows exist yet, so every key 404s. A dead button reads as a
  // broken site rather than as content that is not ready.
  const hook = strip(read("hooks/useDownload.js"));

  assert.match(hook, /retry: false/);
  assert.match(panel, /\{brochure \? \(/);
});

test("download keys are named in one place, not inline", () => {
  const keys = strip(read("lib/downloadKeys.js"));

  assert.match(keys, /productBrochure: "product_brochure"/);
  assert.match(page, /DOWNLOAD_KEYS\.productBrochure/);
});

test("share falls back to the clipboard where there is no share sheet", () => {
  assert.match(page, /navigator\.share/);
  assert.match(page, /navigator\.clipboard\?\.writeText/);
  assert.match(page, /catch \{/, "a dismissed share sheet rejects, which is not an error");
});

test("the wishlist control is a real one now, not the placeholder", () => {
  // It was a disabled button saying saving arrives with customer accounts.
  // RTPP-69 is that, so the placeholder is gone and the control moved up beside
  // "Enquire Now" — an action rather than an afterthought.
  assert.doesNotMatch(panel, /Saving products arrives with customer accounts/);
  assert.doesNotMatch(panel, /Add to Wishlist/);
  assert.match(panel, /<WishlistButton product=\{product\} variant="button" \/>/);
});

// ── Ratings ───────────────────────────────────────────────────────────────

test("no stars are shown for a product with no reviews", () => {
  // Every product in this catalogue is at rating_count 0. "0.0 (0)" reads as a
  // bad score rather than an absence of scores.
  const stars = strip(read("components/ui/Stars.jsx"));
  assert.match(stars, /if \(reviews <= 0\) return null/);
});

test("related products are hidden when there are none", () => {
  // The live endpoint returns an empty list for every product today.
  assert.match(page, /\{relatedItems\.length \? \(/);
});
