import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { articleJsonLd } from "../src/lib/newsJsonLd.js";
import { breadcrumbJsonLd } from "../src/lib/seo.js";

const read = (path) => readFileSync(fileURLToPath(new URL(`../src/${path}`, import.meta.url)), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const article = strip(read("pages/NewsArticlePage.jsx"));
const listing = strip(read("pages/NewsPage.jsx"));
const router = strip(read("routes/router.jsx"));

// The live post, verbatim.
const POST = {
  title: "Rajdhani Expands Its Dealer Network to All 64 Districts",
  slug: "rajdhani-expands-its-dealer-network-to-all-64-districts",
  excerpt: "Our distribution now reaches every district in the country, with local dealers in each.",
  content: "<p>Rajdhani Food Products has completed the expansion…</p>",
  tags: ["dealership", "network", "announcement"],
  published_at: "2026-09-13 08:34:28.127",
  author_name: "Super Admin",
  cover_image: { url: "https://placehold.co/1200x675/1B5E20/FFFFFF/png?text=News", alt: "News" },
  previous: null,
  next: null,
};

const CONTEXT = { siteUrl: "https://rajdhanifood.com", siteName: "Rajdhani Food Products" };

test("both news routes exist", () => {
  // The header nav and the home page already link here — without these two,
  // every page of the site carries a dead link.
  assert.match(router, /path: "\/news", element: <NewsPage \/>/);
  assert.match(router, /path: "\/news\/:slug", element: <NewsArticlePage \/>/);
});

// ── Criterion 2: prev/next correct at both ends ───────────────────────────

test("prev and next come from the API rather than being derived", () => {
  // The endpoint computes them in publish order and returns null at each end —
  // deriving them client-side would need the whole list and would disagree
  // across pagination boundaries.
  assert.match(article, /post\.previous/);
  assert.match(article, /post\.next/);
  assert.doesNotMatch(article, /posts\.findIndex|indexOf\(/, "nothing is derived from a list");
});

test("a missing neighbour renders a spacer, not a gap", () => {
  // At one end of the list, one side is null. Rendering nothing lets the other
  // side slide across the grid; an empty cell keeps it in place.
  assert.match(article, /if \(!post\?\.slug\) \{[\s\S]*?<span aria-hidden="true" \/>/);
});

test("the older/newer labels follow the API's own wording", () => {
  // `previous` is the *older* post and `next` the *newer* one. Inverting them
  // is the easy mistake, and nothing in the payload would catch it.
  assert.match(article, /const older = direction === "previous"/);
  assert.match(article, /older \? "Older" : "Newer"/);
});

test("the whole block is hidden when there are no neighbours at all", () => {
  // The live catalogue has one post, so both are null today.
  assert.match(article, /\{post\.previous \|\| post\.next \? \(/);
});

// ── Criterion 1: long-form legibility ─────────────────────────────────────

test("the article measure is capped", () => {
  // Legibility at every breakpoint is mostly line length. Full-width prose on a
  // desktop is the commonest way long-form content becomes unreadable.
  assert.match(article, /max-w-prose/);
  assert.match(article, /max-w-3xl/, "and the column itself is narrow");
});

test("headings, lists and quotes are styled, not left flat", () => {
  // Sanitised rich text arrives as bare h2/h3/ul/blockquote. Unstyled, a long
  // article renders as one undifferentiated wall.
  //
  // The rules moved to lib/prose.js in RTPP-67, so the legal pages — the same
  // problem at greater length — get the same typography rather than their own.
  const prose = strip(read("lib/prose.js"));

  assert.match(article, /<RichText html=\{post\.content\}/);
  for (const rule of ["_h2\\]", "_h3\\]", "_li\\]", "_blockquote\\]", "_p\\+p\\]"]) {
    assert.match(prose, new RegExp(rule), `no rule for ${rule}`);
  }
});

// ── JSON-LD ───────────────────────────────────────────────────────────────

test("an Article block is emitted with the fields a crawler reads", () => {
  const data = articleJsonLd(POST, CONTEXT);

  assert.equal(data["@type"], "Article");
  assert.equal(data.headline, POST.title);
  assert.equal(data.url, "https://rajdhanifood.com/news/rajdhani-expands-its-dealer-network-to-all-64-districts");
  assert.equal(data.author.name, "Super Admin");
  assert.equal(data.publisher.name, "Rajdhani Food Products");
  assert.deepEqual(data.image, [POST.cover_image.url]);
  assert.equal(data.keywords, "dealership, network, announcement");
});

test("dates are ISO 8601, not the API's own format", () => {
  // schema.org requires ISO. Passing "2026-09-13 08:34:28.127" through would be
  // invalid structured data — and parsing it naively fails in Safari anyway.
  const data = articleJsonLd(POST, CONTEXT);

  assert.match(data.datePublished, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(data.dateModified, data.datePublished);
});

test("absent fields are omitted rather than emitted as null", () => {
  // `"author": null` is worse than no author key — it asserts there is none.
  const data = articleJsonLd({ ...POST, author_name: null, cover_image: null, tags: [], excerpt: null }, CONTEXT);

  assert.ok(!("author" in data));
  assert.ok(!("image" in data));
  assert.ok(!("keywords" in data));
  assert.ok(!("description" in data));
});

test("nothing is emitted without enough to describe", () => {
  assert.equal(articleJsonLd(null, CONTEXT), null);
  assert.equal(articleJsonLd({ title: "No slug" }, CONTEXT), null);
  assert.equal(articleJsonLd(POST, {}), null, "and without a site origin the URLs would be relative");
});

test("the breadcrumb trail is positioned in order", () => {
  // Now the shared builder from lib/seo.js, fed the same trail the page draws.
  // There were two copies of this; the news one has gone.
  const data = breadcrumbJsonLd(
    [
      { label: "Home", to: "/" },
      { label: "News", to: "/news" },
      { label: POST.title, to: `/news/${POST.slug}` },
    ],
    CONTEXT,
  );

  assert.deepEqual(data.itemListElement.map((i) => i.position), [1, 2, 3]);
  assert.deepEqual(data.itemListElement.map((i) => i.name), ["Home", "News", POST.title]);
  assert.equal(data.itemListElement[2].item, `${CONTEXT.siteUrl}/news/${POST.slug}`);
});

test("the article page emits both blocks through the shared component", () => {
  assert.match(article, /<JsonLd id="article" data=\{articleJsonLd\(post, context\)\} \/>/);
  assert.match(article, /<JsonLd\s+id="breadcrumb"/);
  assert.doesNotMatch(article, /function JsonLd/, "no bespoke copy left on the page");
});

test("the pure builder does not import config", () => {
  // config.js reads import.meta.env, which throws under plain node and would
  // make every assertion above impossible.
  const source = strip(read("lib/newsJsonLd.js"));

  assert.doesNotMatch(source, /config\.js/);
  assert.doesNotMatch(source, /import\.meta\.env/);
});

// ── Other ─────────────────────────────────────────────────────────────────

test("the article does not refetch, because fetching counts a view", () => {
  // `view_count` is incremented by the request itself, so every refetch on
  // focus or remount would be another counted view.
  assert.match(article, /refetchOnMount: false/);
  assert.match(article, /refetchOnWindowFocus: false/);
});

test("the listing page number lives in the URL", () => {
  // A link to page three should open page three, same rule as the catalogue.
  assert.match(listing, /useSearchParams\(\)/);
  assert.match(listing, /params\.get\("page"\)/);
});

test("the listing reuses one card design", () => {
  // The home page's "Latest updates" band shows the same PublicNewsCard shape.
  assert.match(listing, /import \{ NewsCard \}/);
});

test("the article cover uses its real shape, the cards use a uniform crop", () => {
  // Covers carry width/height since 2026-09-16. The article's single large
  // image should not be cropped; the cards should stay uniform, or a grid gets
  // rows of ragged heights.
  const card = strip(read("components/news/NewsCard.jsx"));

  assert.match(article, /\$\{post\.cover_image\.width\} \/ \$\{post\.cover_image\.height\}/);
  assert.match(article, /imgClassName="object-contain"/, "uncropped on the article");

  assert.match(card, /aspectRatio="16 \/ 9"/, "uniform in the grid");
  assert.match(card, /width=\{post\.cover_image\?\.width\}/, "intrinsic size still hinted");
});

test("a cover without dimensions still reserves a box", () => {
  // Older rows may lack them, and an unreserved image shifts the whole article
  // down as it loads.
  assert.match(article, /: "16 \/ 9"/);
});
