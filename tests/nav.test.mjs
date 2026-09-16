import assert from "node:assert/strict";
import { test } from "node:test";

import { activeLink, ALL_PRODUCTS, categoryLinks, isActiveLink, isExternal } from "../src/lib/nav.js";

test("a section link stays lit on its child pages", () => {
  // The whole point of prefix matching: reading a product must not un-light
  // "Products" in the header.
  assert.equal(isActiveLink("/products", "/products"), true);
  assert.equal(isActiveLink("/products/premium-tea", "/products"), true);
  assert.equal(isActiveLink("/news/harvest-2026", "/news"), true);
});

test("Home matches only itself", () => {
  // Prefix-matching "/" is the commonest version of this bug: every page in the
  // site starts with "/", so Home would be permanently active.
  assert.equal(isActiveLink("/", "/"), true);
  assert.equal(isActiveLink("/products", "/"), false);
  assert.equal(isActiveLink("/about", "/"), false);
});

test("a partial word is not a match", () => {
  // /products must not light up on /products-archive.
  assert.equal(isActiveLink("/products-archive", "/products"), false);
  assert.equal(isActiveLink("/newsletter", "/news"), false);
});

test("trailing slashes are not a difference", () => {
  assert.equal(isActiveLink("/about/", "/about"), true);
  assert.equal(isActiveLink("/about", "/about/"), true);
  assert.equal(isActiveLink("/", "/"), true);
});

test("a query string or hash does not break matching", () => {
  // The Products dropdown links to /products?category=green-tea, and the
  // browser's pathname will not carry that — but a link's url does.
  assert.equal(isActiveLink("/products", "/products?category=green-tea"), true);
  assert.equal(isActiveLink("/products#top", "/products"), true);
});

test("an external link is never the current page", () => {
  for (const url of ["https://facebook.com/x", "http://example.com", "mailto:a@b.com", "tel:+8801"]) {
    assert.equal(isExternal(url), true, `${url} should be external`);
    assert.equal(isActiveLink("/", url), false);
  }
});

test("missing input does not mark something active", () => {
  assert.equal(isActiveLink("/about", null), false);
  assert.equal(isActiveLink("/about", ""), false);
  assert.equal(isActiveLink(undefined, "/about"), false);
});

test("exactly one header link is active at a time", () => {
  const header = [
    { label: "Home", url: "/" },
    { label: "About", url: "/about" },
    { label: "Products", url: "/products" },
    { label: "News", url: "/news" },
  ];

  assert.equal(activeLink("/", header).label, "Home");
  assert.equal(activeLink("/products/premium-tea", header).label, "Products");
  assert.equal(activeLink("/contact", header), null, "a page with no nav entry lights nothing");

  // No pathname should ever light two.
  for (const pathname of ["/", "/about", "/products", "/products/x", "/news/y", "/contact"]) {
    const lit = header.filter((link) => isActiveLink(pathname, link.url));
    assert.ok(lit.length <= 1, `${pathname} lit ${lit.length} links`);
  }
});

test("every category reaches the dropdown, including empty ones", () => {
  // RTPP-58's first criterion. Filtering on product_count would mean a category
  // created in admin stays invisible until a product is added to it.
  const categories = [
    { id: "1", name: "Premium Tea", slug: "premium-tea", icon_name: "leaf", product_count: 1 },
    { id: "2", name: "Jamuna Tea", slug: "jamuna-tea", icon_name: "wheat", product_count: 0 },
  ];

  const links = categoryLinks(categories);
  assert.equal(links.length, 2, "the empty category is still offered");
  assert.equal(links[1].label, "Jamuna Tea");
});

test("a category link carries the filter the listing reads", () => {
  const [link] = categoryLinks([{ id: "1", name: "Green Tea", slug: "green-tea", product_count: 1 }]);

  assert.equal(link.url, "/products?category=green-tea");
});

test("a slug needing encoding is encoded", () => {
  const [link] = categoryLinks([{ id: "1", name: "Special Blends", slug: "special blends", product_count: 0 }]);

  assert.equal(link.url, "/products?category=special%20blends");
});

test("a missing icon is carried as null rather than guessed", () => {
  // One live category has icon_name: null. The Icon component decides what to
  // render for that; inventing a default here would hide the gap from the admin.
  const [link] = categoryLinks([{ id: "1", name: "Untitled", slug: "untitled" }]);

  assert.equal(link.iconName, null);
  assert.equal(link.productCount, 0);
});

test("a malformed category is dropped rather than linking nowhere", () => {
  // Without a slug there is no page to link to, and /products?category=undefined
  // would render an empty listing with no explanation.
  const links = categoryLinks([{ id: "1", name: "Broken" }, null, { id: "2", name: "Fine", slug: "fine" }]);

  assert.deepEqual(links.map((l) => l.label), ["Fine"]);
  assert.deepEqual(categoryLinks(null), []);
});

test("All Products is separate from the categories", () => {
  assert.equal(ALL_PRODUCTS.url, "/products");
  assert.ok(!categoryLinks([{ id: "1", name: "x", slug: "x" }]).some((l) => l.id === "all"));
});
