import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import {
  absoluteUrl,
  breadcrumbJsonLd,
  listingPath,
  organizationJsonLd,
  PAGE_META,
  pageSuffix,
  productJsonLd,
  resolveMeta,
  serializeJsonLd,
  webSiteJsonLd,
} from "../src/lib/seo.js";

const read = (path) => readFileSync(fileURLToPath(new URL(`../src/${path}`, import.meta.url)), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const hook = strip(read("hooks/useSeo.js"));
const jsonLd = strip(read("components/seo/Seo.jsx"));
const head = strip(read("lib/head.js"));
const layout = strip(read("components/layout/SiteLayout.jsx"));
const gtm = strip(read("lib/gtm.js"));

const SITE_URL = "https://rajdhanifood.com";

// `/public/layout`'s `site`, verbatim from the live API.
const SITE = {
  name: "Rajdhani Food Products",
  tagline: "Premium tea from the gardens of Bangladesh",
  seo: {
    meta_title: "Rajdhani Food Products — Premium Tea",
    meta_description: "Premium quality tea, blended and packed in Bangladesh since 1985.",
  },
  logos: { light: { url: "https://res.cloudinary.com/demo/logo.png" } },
  contact: {
    email_primary: "info@rajdhanifood.com",
    phone_primary: "+8801711000000",
    address_line: "House 12, Road 5, Dhanmondi",
    city: "Dhaka",
    country: "Bangladesh",
  },
};

// ── Criterion 1: the head follows the route ───────────────────────────────

test("a page title composes with the site name rather than replacing it", () => {
  const meta = resolveMeta({ title: "Green Tea", site: SITE, siteUrl: SITE_URL, path: "/products/green" });

  assert.equal(meta.title, "Green Tea — Rajdhani Food Products");
  assert.equal(meta.canonical, "https://rajdhanifood.com/products/green");
});

test("a page with no title of its own gets the site's, unsuffixed", () => {
  // The home page. "Rajdhani Food Products — Rajdhani Food Products" is what
  // passing a title there would produce.
  assert.equal(resolveMeta({ site: SITE, siteUrl: SITE_URL, path: "/" }).title, SITE.seo.meta_title);
});

test("an editor's own meta_title is used exactly as written", () => {
  // They will have put the brand in if they wanted it there.
  const meta = resolveMeta({ title: "Green Tea | Rajdhani", absoluteTitle: true, site: SITE, siteUrl: SITE_URL });

  assert.equal(meta.title, "Green Tea | Rajdhani");
});

test("the description falls through page, then seo_meta, then the tagline", () => {
  assert.equal(resolveMeta({ description: "Own", site: SITE }).description, "Own");
  assert.equal(resolveMeta({ site: SITE }).description, SITE.seo.meta_description);
  assert.equal(
    resolveMeta({ site: { ...SITE, seo: null } }).description,
    SITE.tagline,
    "and the tagline is better than nothing",
  );
  assert.equal(resolveMeta({ site: null }).description, "");
});

test("a blank title is treated as no title, not as an empty one", () => {
  // `post?.title` is undefined on the first render of every article page, and
  // a trimmed-empty string would give a document titled " — Rajdhani…".
  for (const title of [undefined, null, "", "   "]) {
    assert.equal(resolveMeta({ title, site: SITE }).title, SITE.seo.meta_title);
  }
});

test("without a site origin there is no canonical rather than a relative one", () => {
  // SITE_URL is unset in development. A canonical of "/products" is invalid and
  // worse than none at all.
  assert.equal(resolveMeta({ path: "/products", site: SITE, siteUrl: "" }).canonical, null);
  assert.equal(absoluteUrl(null, "/products"), null);
});

test("a trailing slash on the configured origin does not double up", () => {
  assert.equal(absoluteUrl("https://rajdhanifood.com/", "/products"), "https://rajdhanifood.com/products");
  assert.equal(absoluteUrl("https://rajdhanifood.com", "products"), "https://rajdhanifood.com/products");
});

// ── Canonicals for listings ───────────────────────────────────────────────

test("a search or a sort canonicalises onto the plain listing", () => {
  // Ninety products, and left to itself the filter bar would offer a crawler a
  // few thousand URLs holding the same ninety.
  assert.equal(listingPath("/products", { search: "darjeeling", sort: "price_asc" }), "/products");
  assert.equal(listingPath("/products", {}), "/products");
});

test("a category and a page number are pages in their own right", () => {
  // Canonicalising page three onto page one is how the products only reachable
  // from page three stop being found at all.
  assert.equal(listingPath("/products", { category: "green-tea" }), "/products?category=green-tea");
  assert.equal(listingPath("/products", { page: 3 }), "/products?page=3");
  assert.equal(
    listingPath("/products", { category: "green-tea", page: 2, search: "x" }),
    "/products?category=green-tea&page=2",
  );
});

test("page one is not spelled out, so it matches the bare URL", () => {
  assert.equal(listingPath("/news", { page: 1 }), "/news");
  assert.equal(pageSuffix(1), "");
  assert.equal(pageSuffix(3), " — Page 3");
});

// ── Criterion 3: JSON-LD ──────────────────────────────────────────────────

test("Organization carries the address and the social profiles", () => {
  const data = organizationJsonLd(SITE, {
    siteUrl: SITE_URL,
    social: [{ url: "https://facebook.com/rajdhani" }, { url: null }],
  });

  assert.equal(data["@type"], "Organization");
  assert.equal(data.address.addressLocality, "Dhaka");
  assert.deepEqual(data.sameAs, ["https://facebook.com/rajdhani"], "and an empty one is dropped");
});

test("nothing is emitted before the layout payload lands", () => {
  // A half-built Organization naming no address is worse than none.
  assert.equal(organizationJsonLd(null, { siteUrl: SITE_URL }), null);
  assert.equal(organizationJsonLd(SITE, {}), null);
  assert.equal(webSiteJsonLd(SITE, {}), null);
});

test("the search action names the catalogue's own parameter", () => {
  // So the block only claims something the site can actually do.
  const data = webSiteJsonLd(SITE, { siteUrl: SITE_URL });

  assert.match(data.potentialAction.target.urlTemplate, /\/products\?search=\{search_term_string\}$/);
});

const PRODUCT = {
  id: "p1",
  name: "Premium Green Tea",
  slug: "premium-green-tea",
  short_description: "Light, grassy and picked in spring.",
  image: { url: "https://res.cloudinary.com/demo/green.jpg" },
  category: { name: "Green Tea", slug: "green-tea" },
  rating_average: 0,
  rating_count: 0,
  pack_sizes: [
    { sku: "PGT-100", price: "180.00", is_available: true },
    { sku: "PGT-500", price: "820.00", is_available: true },
  ],
};

test("several pack sizes give an AggregateOffer, not a price picked from one", () => {
  // A single Offer would have to choose a price and claim it is the price, and
  // a price in structured data that does not match the page is a manual action.
  const data = productJsonLd(PRODUCT, { siteUrl: SITE_URL, siteName: SITE.name });

  assert.equal(data.offers["@type"], "AggregateOffer");
  assert.equal(data.offers.lowPrice, 180);
  assert.equal(data.offers.highPrice, 820);
  assert.equal(data.offers.offerCount, 2);
  assert.equal(data.offers.priceCurrency, "BDT");
});

test("one pack size gives a plain Offer with one price", () => {
  const data = productJsonLd({ ...PRODUCT, pack_sizes: [PRODUCT.pack_sizes[0]] }, { siteUrl: SITE_URL });

  assert.equal(data.offers["@type"], "Offer");
  assert.equal(data.offers.price, 180);
  assert.ok(!("lowPrice" in data.offers));
});

test("an unavailable or unpriced pack is not offered", () => {
  const data = productJsonLd(
    {
      ...PRODUCT,
      pack_sizes: [
        { sku: "A", price: "180.00", is_available: true },
        { sku: "B", price: "900.00", is_available: false },
        { sku: "C", price: null, is_available: true },
      ],
    },
    { siteUrl: SITE_URL },
  );

  assert.equal(data.offers["@type"], "Offer");
  assert.equal(data.offers.price, 180);
});

test("a product with no reviews carries no rating at all", () => {
  // Which is every product in the catalogue today. A rating of 0 out of 5 is
  // not "unrated", it is the worst possible score, and Google flags a review
  // count of 0 as invalid structured data.
  const data = productJsonLd(PRODUCT, { siteUrl: SITE_URL });

  assert.ok(!("aggregateRating" in data));
});

test("a rated product carries the server's average and count", () => {
  const data = productJsonLd(
    { ...PRODUCT, rating_average: 4.4, rating_count: 30 },
    { siteUrl: SITE_URL },
  );

  assert.equal(data.aggregateRating.ratingValue, 4.4);
  assert.equal(data.aggregateRating.reviewCount, 30);
  assert.equal(data.aggregateRating.bestRating, 5);
});

test("a product with no price is described without an offers block", () => {
  // Rather than one claiming a price of zero.
  const data = productJsonLd({ ...PRODUCT, pack_sizes: [] }, { siteUrl: SITE_URL });

  assert.ok(!("offers" in data));
  assert.equal(data.name, PRODUCT.name);
});

test("the breadcrumb takes the trail the page draws", () => {
  // Rather than deriving one from the URL — a crumb reading "Classic Black"
  // where the path segment is a slug is the point of emitting names.
  const data = breadcrumbJsonLd(
    [
      { label: "Home", to: "/" },
      { label: "Products", to: "/products" },
      { label: "Green Tea", to: "/products?category=green-tea" },
      { label: "Premium Green Tea", to: null },
    ],
    { siteUrl: SITE_URL },
  );

  assert.deepEqual(data.itemListElement.map((i) => i.position), [1, 2, 3, 4]);
  assert.equal(data.itemListElement[0].item, `${SITE_URL}/`);
  assert.ok(!("item" in data.itemListElement[3]), "the current page does not link to itself");
});

test("a trail of one crumb is not a breadcrumb", () => {
  assert.equal(breadcrumbJsonLd([{ label: "Home", to: "/" }], { siteUrl: SITE_URL }), null);
  assert.equal(breadcrumbJsonLd(null, { siteUrl: SITE_URL }), null);
});

test("a closing script tag inside the data cannot break the page", () => {
  // A product named with "</script>" would otherwise end the block early and
  // spill the rest of the JSON into the document as markup.
  const payload = serializeJsonLd({ name: "Tea </script><img onerror=x>" });

  assert.doesNotMatch(payload, /<\/script/i);
  assert.match(payload, /\\u003c\/script/);
  assert.equal(serializeJsonLd(null), null);
});

// ── Wiring ────────────────────────────────────────────────────────────────

test("every route sets a head", () => {
  const router = strip(read("routes/router.jsx"));
  const routed = [...router.matchAll(/element: <(\w+)/g)].map((m) => m[1]);

  for (const component of new Set(routed)) {
    if (component === "SiteLayout" || component === "ScaffoldPage") continue;
    assert.match(
      strip(read(`pages/${component}.jsx`)),
      /useSeo\(/,
      `${component} would keep the previous route's title`,
    );
  }
});

test("the head is set above the early returns, not inside the success branch", () => {
  // Every one of these renders a skeleton while its query is pending, which is
  // the state a crawler on a slow connection is most likely to see.
  for (const page of ["ProductDetailPage", "NewsArticlePage", "AccountPage", "WishlistPage", "HomePage"]) {
    const source = strip(read(`pages/${page}.jsx`));
    const body = source.slice(source.indexOf(`export function ${page}`));

    assert.ok(
      body.indexOf("useSeo(") < body.indexOf("return ("),
      `${page} sets its head only after returning`,
    );
  }
});

test("the layout emits structured data and no head of its own", () => {
  // Two components writing the title would race, and the winner would be
  // whichever effect happened to run last.
  assert.match(layout, /<JsonLd id="organization"/);
  assert.match(layout, /<JsonLd id="website"/);
  assert.doesNotMatch(layout, /useSeo\(/);
});

test("the personal pages are kept out of the index", () => {
  for (const page of ["AccountPage", "WishlistPage"]) {
    assert.match(strip(read(`pages/${page}.jsx`)), /noindex: true/);
  }
  assert.match(hook, /content: "noindex, follow"/, "follow, so the links out still count");
  assert.match(hook, /removeManagedTag\('meta\[name="robots"\]'\)/, "and removed again elsewhere");
});

test("tags are updated in place rather than appended", () => {
  // React 19's own metadata hoisting appends, and a browser uses the *first*
  // title in the document — with one already in index.html and RTPP-73's shell
  // renderer writing another, an appended title is simply ignored.
  assert.match(head, /document\.head\.querySelector\(selector\)/);
  assert.match(head, /if \(!element\)/);
  assert.doesNotMatch(hook, /createElement\("title"\)/);
});

test("only tags this app created are ever removed", () => {
  // The CSP meta, the stylesheet and the preloads are in the same head.
  assert.match(head, /export const MANAGED = "data-rajdhani-seo"/);
  assert.match(head, /\$\{selector\}\[\$\{MANAGED\}\]/);
});

test("react-helmet-async was not added", () => {
  // Named in the ticket, but unmaintained and not React 19-compatible.
  const pkg = JSON.parse(readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"));

  assert.ok(!("react-helmet-async" in (pkg.dependencies ?? {})));
  assert.ok(!("react-helmet" in (pkg.dependencies ?? {})));
});

test("each structured-data block cleans up only its own", () => {
  // A Product block left behind after navigating to the news index would
  // describe a page that is no longer there.
  assert.match(jsonLd, /script\[\$\{MANAGED\}="\$\{id\}"\]/);
  assert.match(jsonLd, /return \(\) => document\.head\.querySelector\(selector\)\?\.remove\(\)/);
});

// ── Tag Manager ───────────────────────────────────────────────────────────

test("Tag Manager does nothing at all without an id", () => {
  // Which is the state today: the settings row exists and is empty, and no
  // public endpoint exposes it. An injected script with an empty id 404s on
  // every page load.
  assert.match(gtm, /if \(!GTM_ID \|\| started/);
  assert.match(gtm, /if \(!GTM_ID \|\| typeof globalThis\.dataLayer === "undefined"\) return;/);
});

test("the container is injected once, not once per route", () => {
  assert.match(gtm, /let started = false/);
  assert.match(gtm, /document\.getElementById\(SCRIPT_ID\)/, "and not twice across a hot reload");
  assert.match(layout, /startTagManager\(\)/);
});

test("a route change sends a page view", () => {
  // Without it every visit reads as a one-page session: the container script
  // runs once and nothing tells it the route changed.
  assert.match(layout, /trackPageView\(`\$\{pathname\}\$\{search\}`, document\.title\)/);
  assert.match(layout, /setTimeout\(/, "after useSeo has set the title for the new route");
});

// ── Content ───────────────────────────────────────────────────────────────

test("every page description is short enough to survive a search result", () => {
  // Google truncates at roughly 160 characters.
  for (const [key, meta] of Object.entries(PAGE_META)) {
    assert.ok(meta.title, `${key} has no title`);
    assert.ok(meta.description.length <= 160, `${key} is ${meta.description.length} characters`);
    assert.ok(meta.description.length >= 40, `${key} is too thin to be worth having`);
  }
});

test("no two pages share a description", () => {
  // Duplicate descriptions across a site are the single commonest reason
  // Search Console reports a page as a duplicate of another.
  const seen = Object.values(PAGE_META).map((m) => m.description);

  assert.equal(new Set(seen).size, seen.length);
});

test("the static descriptions are a stand-in and say so", () => {
  // The admin already edits `seo_meta`; nothing public serves it. When one of
  // those endpoints exists this map becomes the fallback and the note goes.
  assert.match(read("lib/seo.js"), /stand-in, and should be deleted/);
});
