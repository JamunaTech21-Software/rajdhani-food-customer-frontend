import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const read = (path) => readFileSync(fileURLToPath(new URL(`../src/${path}`, import.meta.url)), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const about = strip(read("pages/AboutPage.jsx"));
const quality = strip(read("pages/QualityPage.jsx"));
const legal = strip(read("pages/LegalPage.jsx"));
const section = strip(read("components/content/PageBlockSection.jsx"));
const heading = strip(read("components/content/SectionHeading.jsx"));
const certifications = strip(read("components/content/Certifications.jsx"));
const content = strip(read("hooks/usePageContent.js"));
const prose = strip(read("lib/prose.js"));
const router = strip(read("routes/router.jsx"));

// ── The four dead links ───────────────────────────────────────────────────

test("all four routes exist, at the URLs the API's own menus link", () => {
  // Until now /about and /quality 404'd from the header of every page, and
  // /privacy and /terms from the footer of every page.
  assert.match(router, /path: "\/about", element: <AboutPage \/>/);
  assert.match(router, /path: "\/quality", element: <QualityPage \/>/);
  assert.match(router, /path: "\/privacy",/);
  assert.match(router, /path: "\/terms", element: <LegalPage pageKey=\{PAGE_KEYS\.terms\}/);
});

test("the two legal routes are one component with a different key", () => {
  // They are the same page. Two copies would drift the first time one of them
  // gained a contents list.
  assert.equal((router.match(/<LegalPage /g) ?? []).length, 2);
  assert.match(router, /pageKey=\{PAGE_KEYS\.privacy\}/);
});

// ── Criterion 1: every block editable from Page Content ───────────────────

test("no page carries any of the comps' copy", () => {
  // The criterion, as directly as it can be stated here: if the words were in
  // the bundle, an editor could not change them.
  const copy = /trusted name in the tea industry|lush green tea gardens|handpicked from the best/i;

  assert.doesNotMatch(about + quality + legal, copy);
});

test("every section is a block looked up by key", () => {
  assert.match(about, /blockFor\(all, "our_story"\)/);
  assert.match(about, /\["mission", "vision", "values"\]/);
  assert.match(about, /blockFor\(all, "strength"\)/);
  assert.match(quality, /blockFor\(all, "commitment"\)/);
  assert.match(quality, /blockFor\(all, "assurance"\)/);
});

test("a section whose block does not exist renders nothing", () => {
  // Most of these rows have not been created yet. An empty heading over an
  // empty column is worse than a section that is simply absent.
  assert.match(section, /if \(!block\) return null;/);
  assert.match(about, /\{foundations\.length \? \(/);
  assert.match(certifications, /if \(!items\?\.length\) return null;/);
});

test("a group heading is editable too, with a structural label as the floor", () => {
  // The criterion says *every* block. These headings sit above a group rather
  // than inside one, so they read an optional block and fall back — the same
  // arrangement as PageHero's title.
  assert.match(heading, /const text = block\?\.heading \|\| heading;/);
  assert.match(about, /block=\{blockFor\(all, "foundations"\)\}/);
  assert.match(quality, /block=\{blockFor\(all, "certifications"\)\}/);
});

test("one renderer draws a page block, wherever it appears", () => {
  // Home, About and Quality all render HomeWelcomeBlock. Three renderers for
  // one payload is how the three drift.
  const welcome = strip(read("components/home/WelcomeBlock.jsx"));

  assert.match(welcome, /<PageBlockBody/);
  assert.match(section, /export function PageBlockBody/);
  assert.match(about, /PageBlockSection/);
});

// ── Criterion 2: legal typography and anchor links ────────────────────────

test("the legal body is anchored before it is rendered", () => {
  assert.match(legal, /legalDocument\(blocksOf\(blocks\)\)/);
  assert.match(legal, /<RichText html=\{html\} \/>/);
});

test("the contents list links to the ids that were injected", () => {
  assert.match(legal, /href=\{`#\$\{heading\.id\}`\}/);
  assert.match(legal, /aria-labelledby="contents-heading"/, "and is a navigation landmark");
});

test("sub-clauses are kept out of the contents list", () => {
  assert.match(legal, /\.filter\(\(heading\) => heading\.level === 2\)/);
});

test("an anchored heading does not land under the sticky header", () => {
  // Without scroll-margin the heading a link points at sits behind the header,
  // so the link appears to jump to the wrong clause.
  // The clearance became `--scroll-offset` in R6, so the header's height is one
  // number: a form field scrolled into view needs exactly the same allowance.
  assert.match(prose, /\[&_h2\]:scroll-mt-\(--scroll-offset\)/);
  assert.match(prose, /\[&_h3\]:scroll-mt-\(--scroll-offset\)/);
});

test("long-form typography is one set of rules, shared with the article page", () => {
  const article = strip(read("pages/NewsArticlePage.jsx"));

  assert.match(article, /<RichText html=\{post\.content\}/);
  assert.match(legal, /RichText/);
  for (const rule of ["_h2\\]", "_h3\\]", "_li\\]", "_blockquote\\]", "_p\\+p\\]", "_table\\]"]) {
    assert.match(prose, new RegExp(rule), `no rule for ${rule}`);
  }
});

test("a legal page with no text says so rather than showing a blank column", () => {
  // Live state today: no privacy or terms blocks exist. §10.5 asks for a
  // friendly empty state, not an empty page.
  assert.match(legal, /has not been published yet/);
  assert.match(legal, /to="\/contact"/, "and offers a way to ask for it");
  assert.match(legal, /aria-busy="true"/, "with a skeleton while it is still loading");
});

// ── Endpoints that may not be routed ──────────────────────────────────────

test("a missing endpoint reads as no content, not as an error page", () => {
  // All five are live since RTPP-67's backend update. The guard stays: these
  // hooks are the first thing a new environment hits, and a 404 from a route
  // that is not wired up there must not take down a page whose banner and
  // heading arrived perfectly well.
  assert.match(content, /error\.code === ErrorCode\.NOT_FOUND \|\| error\.status === 404/);
  assert.match(content, /if \(isMissing\(error\)\) return null;/);
  assert.match(content, /throw error;/, "and anything else still surfaces");
});

test("a 404 is not retried four times on every page view", () => {
  // One per query: page blocks, certifications, and the shared section query
  // behind feature items, process steps and stats.
  assert.equal((content.match(/retry: false/g) ?? []).length, 3);
});

test("the shapes are the ones the schema already documents", () => {
  // HomeWelcomeBlock for a block, Certification for a mark — both already
  // served by /public/home or specified in openapi.yaml, so when the endpoints
  // land this hook is the only file that should need to move.
  assert.match(section, /block\.eyebrow/);
  assert.match(section, /block\.subheading/);
  assert.match(section, /block\.cta_label && block\.cta_url/);
  assert.match(certifications, /certificate_url: certificate/);
});

// ── Certifications ────────────────────────────────────────────────────────

test("a certification with no logo looks deliberate, not broken", () => {
  // logo_id is null on all three seeded rows — the real marks are the client's
  // to upload under RTPP-86.
  assert.match(certifications, /ShieldCheck/);
  assert.match(certifications, /logo\?\.url \? \(/);
});

test("a certificate PDF becomes a link only when there is one", () => {
  // `certificate_url` is null on every row today. A link to nothing is worse
  // than no link.
  //
  // The name matters. The public endpoint sends `certificate_url`, a string,
  // where the admin schema has `certificate_file_id`; reading the admin's name
  // here gave `undefined`, so the link would never have appeared — and only
  // once somebody uploaded a PDF and wondered where it went.
  assert.match(certifications, /\{certificate \? \(/);
  assert.match(certifications, /href=\{certificate\}/);
  assert.doesNotMatch(certifications, /certificate_file/, "the admin's field name, not the public one");
  assert.match(certifications, /opens in a new tab/);
});

// ── Page structure ────────────────────────────────────────────────────────

test("each page has exactly one h1, from the shared hero", () => {
  for (const [name, page] of [["about", about], ["quality", quality], ["legal", legal]]) {
    assert.match(page, /<PageHero/, `${name} has no hero`);
    assert.doesNotMatch(page, /<h1/, `${name} draws its own h1 as well`);
  }
});

test("the legal pages get a hero with no banner placement of their own", () => {
  // There is no LEGAL_HERO in BannerPlacementEnum, so the title is all there is
  // — which PageHero already treats as the floor rather than as content.
  assert.match(legal, /<PageHero title=\{title\} breadcrumb=\{title\} \/>/);
});

test("the assurance panel's checklist moves to its own column", () => {
  // PageBlockBody draws bullets under the text; the comp puts them beside it.
  assert.match(quality, /bullet_points: \[\]/);
  assert.match(quality, /bulletsOf\(block\)/);
});

// ── The sections RTPP-67's backend update unblocked ───────────────────────

const featureGrid = strip(read("components/content/FeatureGrid.jsx"));
const timeline = strip(read("components/content/ProcessTimeline.jsx"));

test("the three section resources are each filtered, and the filter is required", () => {
  // The API answers an absent or unrecognised section with 422, not an empty
  // list — which is the right way round: a typo surfaces instead of looking
  // like "nobody has written this yet".
  assert.match(content, /\/public\/feature-items\?section=\$\{encodeURIComponent\(section\)\}/);
  assert.match(content, /\/public\/process-steps\?group=\$\{encodeURIComponent\(group\)\}/);
  assert.match(content, /\/public\/stats\?group=\$\{encodeURIComponent\(group\)\}/);
  assert.match(content, /enabled: Boolean\(value\)/, "no request before the group is known");
});

test("About reads the groups its comp asks for", () => {
  assert.match(about, /useStats\("ABOUT"\)/);
  assert.match(about, /useProcessSteps\("MANUFACTURING_PROCESS"\)/);
});

test("Quality reads the groups its comp asks for", () => {
  assert.match(quality, /useFeatureItems\("QUALITY_COMMITMENT"\)/);
  assert.match(quality, /useProcessSteps\("QUALITY_PROCESS"\)/);
});

test("a section with no rows yet is absent, not an empty heading", () => {
  // Every one of these groups is empty in the database today, so this is the
  // state the pages are actually in.
  assert.match(featureGrid, /if \(!items\?\.length\) return null;/);
  assert.match(timeline, /if \(!steps\?\.length\) return null;/);
  assert.match(quality, /\{itemsOf\(process\)\.length \? \(/);
  assert.match(about, /\{itemsOf\(manufacturing\)\.length \? \(/);
});

test("a block and its panel can be absent independently", () => {
  // The strength block draws the manufacturing steps where a block would put
  // its image. No block and the section does not render; no steps and the
  // block falls back to its own image — `undefined`, not `null`, because
  // `children ?? image` is what chooses.
  assert.match(about, /<ProcessTimeline steps=\{itemsOf\(manufacturing\)\} compact \/>\s*\n\s*\) : undefined\}/);
  assert.match(quality, /<FeatureGrid items=\{itemsOf\(commitments\)\} \/> : undefined\}/);
  assert.match(section, /\{children \?\?/);
});

test("a step is numbered by its row, not by its position", () => {
  // `step_number` is unique per group in the database and an editor reordering
  // steps changes it. Numbering from the index would renumber a step the
  // moment another was inserted above it.
  assert.match(timeline, /\{step\.step_number\}/);
  assert.doesNotMatch(timeline, /\{index \+ 1\}/);
});

test("a step with no image still reserves its box", () => {
  // No seeded row carries one, so this is every step today.
  assert.match(timeline, /grid aspect-\[4\/3\] w-full place-items-center rounded-lg bg-brand-tint/);
  assert.match(timeline, /aspectRatio="4 \/ 3"/, "and one that does, reserves the same shape");
});

test("the chevrons between steps are decorative and do not become list items", () => {
  // A list item whose only content is a chevron is an item with no content,
  // and a screen reader counts it.
  assert.match(timeline, /separated \? \(/);
  assert.match(timeline, /<ChevronRight[\s\S]*?aria-hidden="true"/);
  assert.match(timeline, /separated=\{index < steps\.length - 1\}/, "and the last step has none");
});

test("two stats bands on one site do not share a landmark name", () => {
  const stats = strip(read("components/home/StatsBand.jsx"));

  assert.match(stats, /label = "Rajdhani by the numbers"/);
  assert.match(stats, /aria-label=\{label\}/);
  assert.match(about, /label="Rajdhani in numbers"/);
});

test("one renderer draws a feature item, wherever it appears", () => {
  // The USP strip, Quality's commitment grid and the dealer benefits are the
  // same payload. It lived inside UspStrip until the other two had an endpoint.
  assert.match(strip(read("components/home/UspStrip.jsx")), /<FeatureItem key=\{item\.id\}/);
  assert.match(featureGrid, /export function FeatureItem/);
  assert.match(quality, /<FeatureGrid items=/);
});
