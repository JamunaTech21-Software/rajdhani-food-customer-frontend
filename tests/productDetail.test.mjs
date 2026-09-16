import assert from "node:assert/strict";
import { test } from "node:test";

import {
  breadcrumbFor,
  defaultPackSize,
  formatPrice,
  packDetails,
  sortedPackSizes,
  visibleTabs,
} from "../src/lib/productDetail.js";

// The two live pack sizes on rajdhani-classic-black-tea.
const PACKS = [
  { id: "1", label: "250g", sku: "RCB-250", price: 150, compare_price: null, discount_percent: null, price_includes_vat: true, is_default: true, is_available: true, sort_order: 1 },
  { id: "2", label: "500g", sku: "RCB-500", price: 280, compare_price: 300, discount_percent: 7, price_includes_vat: true, is_default: false, is_available: true, sort_order: 2 },
];

// ── Criterion: empty tabs are hidden, never shown blank ───────────────────

test("only tabs with content appear", () => {
  // rajdhani-green-tea, live: description, ingredients and brewing_guide only.
  const product = {
    description: "<p>Light and grassy.</p>",
    ingredients: "<p>Green tea leaves.</p>",
    nutrition_info: null,
    brewing_guide: "<p>80°C for two minutes.</p>",
    packaging_info: null,
  };

  const ids = visibleTabs(product).map((t) => t.id);
  assert.deepEqual(ids, ["description", "ingredients", "brewing", "reviews"]);
});

test("a product with one populated tab shows one, plus reviews", () => {
  // rajdhani-loose-leaf-special, live.
  const ids = visibleTabs({ description: "<p>Loose leaf.</p>" }).map((t) => t.id);
  assert.deepEqual(ids, ["description", "reviews"]);
});

test("a product with nothing written shows only reviews", () => {
  // Not an error state — reviews is where a customer writes one, so it stands
  // alone rather than leaving a tab strip with nothing in it.
  assert.deepEqual(visibleTabs({}).map((t) => t.id), ["reviews"]);
  assert.deepEqual(visibleTabs(null).map((t) => t.id), ["reviews"]);
});

test("markup with no words in it counts as empty", () => {
  // A rich-text field an editor cleared often keeps its wrapper tags. A tab
  // opening onto an empty paragraph is exactly what the criterion forbids.
  for (const empty of ["<p></p>", "<p><br></p>", "   ", "<p>&nbsp;</p>", "<div>\n</div>"]) {
    assert.deepEqual(
      visibleTabs({ description: empty }).map((t) => t.id),
      ["reviews"],
      `${empty} should not open a tab`,
    );
  }
});

test("the review count is in the tab label when there are any", () => {
  assert.equal(visibleTabs({}, { reviewCount: 120 }).at(-1).label, "Reviews (120)");
  assert.equal(visibleTabs({}, { reviewCount: 0 }).at(-1).label, "Reviews");
});

test("tabs keep the order §10.2 lists them in", () => {
  const all = {
    description: "a", ingredients: "b", nutrition_info: "c", brewing_guide: "d", packaging_info: "e",
  };

  assert.deepEqual(
    visibleTabs(all).map((t) => t.id),
    ["description", "ingredients", "nutrition", "brewing", "packaging", "reviews"],
  );
});

// ── Criterion: switching pack size updates every dependent field ──────────

test("each pack size carries its own SKU, price and discount", () => {
  // The failure this guards: a price that moves while the SKU beside it does
  // not. Every dependent field comes from one call, so it cannot go half done.
  const small = packDetails(PACKS[0]);
  assert.equal(small.sku, "RCB-250");
  assert.equal(small.price, 150);
  assert.equal(small.comparePrice, null, "no compare price, so no strike-through");
  assert.equal(small.discountPercent, null);

  const large = packDetails(PACKS[1]);
  assert.equal(large.sku, "RCB-500");
  assert.equal(large.price, 280);
  assert.equal(large.comparePrice, 300);
  assert.equal(large.discountPercent, 7);
});

test("the API's own discount figure is preferred over a derived one", () => {
  // Deriving when the server already said 7% risks a badge that disagrees with
  // the number beside it.
  assert.equal(packDetails(PACKS[1]).discountPercent, 7);
});

test("a discount is derived only when the API omits one", () => {
  const pack = { price: 75, compare_price: 100, discount_percent: null };
  assert.equal(packDetails(pack).discountPercent, 25);
});

test("a compare price that is not a saving is not shown as one", () => {
  // Stale data where compare <= price would otherwise render "৳150 ৳150"
  // struck through with a 0% badge — a false discount claim.
  for (const compare of [150, 100, 0]) {
    const details = packDetails({ price: 150, compare_price: compare });
    assert.equal(details.comparePrice, null, `compare ${compare} should not show`);
    assert.equal(details.discountPercent, null);
  }
});

test("a missing pack size yields empty fields rather than throwing", () => {
  const none = packDetails(null);
  assert.equal(none.sku, null);
  assert.equal(none.price, null);
  assert.equal(none.available, false);
});

test("VAT inclusion is carried through, since the page states it", () => {
  assert.equal(packDetails(PACKS[0]).includesVat, true);
  assert.equal(packDetails({ price: 1, price_includes_vat: false }).includesVat, false);
});

// ── Default selection ─────────────────────────────────────────────────────

test("the admin's default pack is the one selected first", () => {
  assert.equal(defaultPackSize(PACKS).label, "250g");
});

test("a sold-out default gives way to an available size", () => {
  // Opening on a size nobody can buy shows a price that is not purchasable.
  const packs = [
    { ...PACKS[0], is_available: false },
    { ...PACKS[1], is_default: false },
  ];
  assert.equal(defaultPackSize(packs).label, "500g");
});

test("all sold out still selects something, rather than showing no price", () => {
  const packs = PACKS.map((p) => ({ ...p, is_available: false }));
  assert.equal(defaultPackSize(packs).label, "250g");
});

test("no pack sizes is not a crash", () => {
  assert.equal(defaultPackSize([]), null);
  assert.equal(defaultPackSize(null), null);
});

test("pack sizes render in the admin's order, not the API's array order", () => {
  const shuffled = [PACKS[1], PACKS[0]];
  assert.deepEqual(sortedPackSizes(shuffled).map((p) => p.label), ["250g", "500g"]);
});

// ── Presentation ──────────────────────────────────────────────────────────

test("prices are formatted as Taka", () => {
  assert.match(formatPrice(280), /280\.00/);
  assert.match(formatPrice(280), /৳|BDT/);
  assert.equal(formatPrice(null), null, "and a missing price renders nothing");
});

test("the breadcrumb links back to the filtered listing", () => {
  // Category → /products?category=slug, which is the same URL the listing's own
  // filter produces, so Back from here lands where the visitor expects.
  const trail = breadcrumbFor({
    name: "Rajdhani Classic Black Tea",
    category: { name: "Classic Black", slug: "classic-black" },
  });

  assert.deepEqual(trail.map((c) => c.label), ["Home", "Products", "Classic Black", "Rajdhani Classic Black Tea"]);
  assert.equal(trail[2].to, "/products?category=classic-black");
  assert.equal(trail.at(-1).to, null, "the current page is not a link");
});

test("a product with no category loses that crumb rather than showing a blank one", () => {
  const trail = breadcrumbFor({ name: "Something" });
  assert.deepEqual(trail.map((c) => c.label), ["Home", "Products", "Something"]);
});
