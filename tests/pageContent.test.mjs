import assert from "node:assert/strict";
import { test } from "node:test";

import {
  blockFor,
  bulletsOf,
  headingSlug,
  headingText,
  legalDocument,
  PAGE_KEYS,
  showContents,
  withAnchors,
} from "../src/lib/pageContent.js";

// The seeded blocks, verbatim from ContentSeeder.
const ABOUT = [
  {
    block_key: "our_story",
    eyebrow: "OUR STORY",
    heading: "Built on One Blend",
    body: "<p>Rajdhani Food Products started as a single blend sold from a single shop.</p>",
    bullet_points: null,
  },
  {
    block_key: "mission",
    eyebrow: "OUR MISSION",
    heading: "Good Tea, Every Packet",
    body: "<p>To put a consistent, honest cup of tea within reach of every household.</p>",
    bullet_points: null,
  },
  {
    block_key: "vision",
    eyebrow: "OUR VISION",
    heading: "The Name People Ask For",
    body: "<p>To be the tea a shopkeeper reaches for without being asked twice.</p>",
    bullet_points: null,
  },
];

const COMMITMENT = {
  block_key: "commitment",
  eyebrow: "OUR COMMITMENT",
  heading: "Tested Before It Leaves",
  body: "<p>Every batch is cupped and lab-tested against its specification.</p>",
  bullet_points: ["Moisture content", "Leaf grade", "Liquor colour and strength", "Packaging seal integrity"],
};

// ── Page keys ─────────────────────────────────────────────────────────────

test("the page keys are the backend's own", () => {
  // SeoMetaSeeder and NavigationSeeder both spell them this way, and the live
  // `legal` menu links /privacy and /terms — not /privacy-policy.
  assert.deepEqual(Object.values(PAGE_KEYS), ["about", "quality", "privacy", "terms"]);
});

// ── Block lookup ──────────────────────────────────────────────────────────

test("a block is found by its key", () => {
  assert.equal(blockFor(ABOUT, "mission").heading, "Good Tea, Every Packet");
});

test("a block an editor has not created is null, not a crash", () => {
  // `about/values` and `about/strength` do not exist in the database today.
  assert.equal(blockFor(ABOUT, "values"), null);
  assert.equal(blockFor(null, "mission"), null);
  assert.equal(blockFor([], "mission"), null);
});

test("bullet points are always an array", () => {
  // The admin schema types the column [array, 'null']; /public/home always
  // sends an array. Both arrive here rather than at every call site.
  assert.deepEqual(bulletsOf(COMMITMENT), COMMITMENT.bullet_points);
  assert.deepEqual(bulletsOf(ABOUT[0]), []);
  assert.deepEqual(bulletsOf(null), []);
  assert.deepEqual(bulletsOf({ bullet_points: ["Kept", "", "  ", 7, null] }), ["Kept"]);
});

// ── Criterion 2: anchor links ─────────────────────────────────────────────

test("every heading in a policy gets an id and a place in the contents", () => {
  const { html, headings } = withAnchors(
    "<h2>Information We Collect</h2><p>…</p><h3>Cookies</h3><h2>Your Rights</h2>",
  );

  assert.match(html, /<h2 id="information-we-collect">/);
  assert.match(html, /<h3 id="cookies">/);
  assert.deepEqual(headings.map((h) => h.id), ["information-we-collect", "cookies", "your-rights"]);
  assert.deepEqual(headings.map((h) => h.level), [2, 3, 2]);
});

test("the same id is produced every time, so a shared link keeps working", () => {
  // Derived rather than stored — TipTap gives an editor no way to set an id —
  // which only helps if it is derived the same way next month.
  const once = withAnchors("<h2>How We Use Your Data</h2>").headings[0].id;
  const twice = withAnchors("<h2>How We Use Your Data</h2>").headings[0].id;

  assert.equal(once, twice);
  assert.equal(once, "how-we-use-your-data");
});

test("two sections with the same name do not share one id", () => {
  // The second would be unreachable: the browser jumps to the first match.
  const { headings } = withAnchors("<h2>Your Rights</h2><h2>Your Rights</h2><h2>Your Rights</h2>");

  assert.deepEqual(headings.map((h) => h.id), ["your-rights", "your-rights-2", "your-rights-3"]);
  assert.equal(new Set(headings.map((h) => h.id)).size, 3);
});

test("an id an editor somehow set already is left alone", () => {
  // It is what any existing link points at.
  const { html, headings } = withAnchors('<h2 id="clause-4">Liability</h2>');

  assert.match(html, /id="clause-4"/);
  assert.equal(headings[0].id, "clause-4");
  assert.equal(html.match(/id=/g).length, 1, "and no second id is added beside it");
});

test("markup and entities inside a heading do not reach the id or the label", () => {
  const { html, headings } = withAnchors("<h2>Terms &amp; <strong>Conditions</strong></h2>");

  assert.equal(headings[0].text, "Terms & Conditions");
  assert.equal(headings[0].id, "terms-conditions");
  assert.match(html, /<strong>Conditions<\/strong>/, "the heading's own markup survives");
});

test("a heading with no Latin characters still gets a usable id", () => {
  // A Bengali heading would otherwise need percent-encoding to appear in an
  // href — a link nobody can read or type is not much of an anchor.
  const { headings } = withAnchors("<h2>গোপনীয়তা</h2>");

  assert.equal(headings[0].id, "section-1");
  assert.equal(headings[0].text, "গোপনীয়তা");
});

test("h1, h4 and paragraphs are left untouched", () => {
  // The page supplies its own h1. A document that adds a second one has two
  // titles, and nothing downstream can tell which is the page's.
  const { html, headings } = withAnchors("<h1>Privacy</h1><h4>Note</h4><p>Body</p>");

  assert.equal(headings.length, 0);
  assert.equal(html, "<h1>Privacy</h1><h4>Note</h4><p>Body</p>");
});

test("an empty heading is skipped rather than given an id of nothing", () => {
  const { headings } = withAnchors("<h2></h2><h2>  </h2><h2>Real</h2>");
  assert.deepEqual(headings.map((h) => h.text), ["Real"]);
});

test("no body means no document and no headings", () => {
  assert.deepEqual(withAnchors(null), { html: "", headings: [] });
  assert.deepEqual(withAnchors(""), { html: "", headings: [] });
});

test("a slug is capped rather than run to the width of a sentence", () => {
  const long = headingSlug("a".repeat(200));
  assert.ok(long.length <= 64, `${long.length} characters`);
});

test("heading text survives round-tripping through entities", () => {
  assert.equal(headingText("<em>5. Data &quot;sharing&quot;</em>"), '5. Data "sharing"');
});

// ── The legal document ────────────────────────────────────────────────────

test("several blocks become one document in the order they arrived", () => {
  // Which block keys an editor chose is not something the page can know, so it
  // renders all of them rather than looking for named ones.
  const { html, headings } = legalDocument([
    { block_key: "intro", heading: "Introduction", body: "<p>First.</p>" },
    { block_key: "data", heading: "Data We Hold", body: "<p>Second.</p><h3>Cookies</h3>" },
  ]);

  assert.deepEqual(headings.map((h) => h.text), ["Introduction", "Data We Hold", "Cookies"]);
  assert.ok(html.indexOf("First.") < html.indexOf("Second."));
});

test("a block heading joins the contents alongside the ones inside a body", () => {
  const { headings } = legalDocument([{ heading: "Scope", body: "<h2>Definitions</h2>" }]);
  assert.deepEqual(headings.map((h) => h.id), ["scope", "definitions"]);
});

test("a heading from the column is escaped, since it is not sanitised HTML", () => {
  // `body` comes back through RichText::sanitize(); `heading` is a plain
  // varchar an admin typed, and it is being put into markup here.
  const { html } = legalDocument([{ heading: "Terms <script>alert(1)</script>", body: "" }]);

  assert.equal(html.includes("<script>"), false);
  assert.match(html, /&lt;script&gt;/);
});

test("no blocks means an empty document rather than an empty page of nothing", () => {
  assert.deepEqual(legalDocument([]), { html: "", headings: [] });
  assert.deepEqual(legalDocument(null), { html: "", headings: [] });
});

test("a block with only a body still renders", () => {
  assert.match(legalDocument([{ body: "<p>Just text.</p>" }]).html, /Just text\./);
});

// ── The contents list ─────────────────────────────────────────────────────

test("a contents list appears only when there is enough to navigate", () => {
  const of = (count) => Array.from({ length: count }, (_, i) => ({ id: `h${i}`, level: 2 }));

  assert.equal(showContents(of(2)), false, "two links above a two-section page cost more than they save");
  assert.equal(showContents(of(3)), true);
  assert.equal(showContents([]), false);
  assert.equal(showContents(null), false);
});

test("sub-clauses alone do not earn a contents list", () => {
  assert.equal(showContents([{ level: 3 }, { level: 3 }, { level: 3 }, { level: 3 }]), false);
});
