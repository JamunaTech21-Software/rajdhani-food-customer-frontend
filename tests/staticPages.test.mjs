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
const pageHero = strip(read("components/layout/PageHero.jsx"));

// ── The About comp: the "Our Company" band ───────────────────────────────

test("a block section is not two equal columns", () => {
  // Measured off the About comp's "Our Company" band: text x 80..397 of a
  // 1024-wide frame, photograph x 490..949 — 41% / 59% of the content width
  // with a 116px gutter. At `grid-cols-2` the text had half the row and the
  // picture was cramped by the same amount.
  //
  // It suits the other two users too: About's "Our Strength" puts five
  // process steps in the wide half and Quality's commitment block a feature
  // grid, and both were being squeezed into 50%.
  assert.match(section, /lg:grid-cols-\[0\.7fr_minmax\(0,1fr\)\] lg:items-center lg:gap-28/);
  assert.doesNotMatch(section, /lg:grid-cols-2/);
});

test("the wide column can actually shrink to its share", () => {
  // `0.7fr 1fr` is a ratio a grid will honour only if both columns can reach
  // it. A column's default minimum is its content, and About's five process
  // tiles at `min-w-[8rem]` came to 704px — so the second column refused to go
  // below that and took the difference out of the first. The heading wrapped
  // to four lines where the comp has two.
  //
  // Both halves of the fix are needed: `minmax(0,1fr)` lets the column shrink,
  // and a narrower tile lets its contents follow. 659px across five tiles and
  // four 16px gaps is 119px each, so 7rem clears it.
  assert.match(section, /minmax\(0,1fr\)/);
  assert.match(timeline, /compact \? "min-w-\[7rem\]" : "min-w-\[10rem\]"/);
});

test("the photograph sits on a card, as the comp draws it", () => {
  // 16px and a soft shadow, lifting it off the near-white band. `rounded-xl`
  // is 24px, which on a 575px-wide picture reads as a rounded button.
  assert.match(section, /overflow-hidden rounded-lg shadow-card/);
  assert.doesNotMatch(section, /overflow-hidden rounded-xl/);
});

// ── The About comp: the banner ───────────────────────────────────────────

test("the banner scrim is a gradient, so the photograph survives it", () => {
  // Sampled across the About comp's banner: #0a1612 at the left edge,
  // #1a2d18 at 300, #807b47 at 600, #a3ab02 at 750 of a 1024-wide frame. The
  // text sits on near black and the tea garden is at full brightness two
  // thirds across. A flat `bg-ink` guaranteed the contrast by throwing the
  // picture away.
  assert.match(pageHero, /lg:bg-gradient-to-r lg:from-ink lg:from-0% lg:via-ink\/75 lg:via-35% lg:to-transparent lg:to-72%/);
  assert.doesNotMatch(pageHero, /className="absolute inset-0 -z-10 bg-ink"/, "not a flat scrim");

  // And flat below `lg`, the same fix the home hero needed: a gradient that
  // clears at 72% of the viewport protects the text only while the text is
  // in the left two thirds, and `max-w-xl` runs the full width of a phone.
  // The browser had "the trust of millions" on bright sky at 390.
  assert.match(pageHero, /bg-ink\/75 lg:bg-transparent/);

  // The slider still scales it, so an editor can still add protection — but
  // not remove it. The live About row is at 40, which rendered a white
  // heading on a sunlit hillside; the comp's left edge is about 85% coverage,
  // and that is the floor.
  assert.match(pageHero, /style=\{\{ opacity: overlay \}\}/);
  assert.match(pageHero, /const MINIMUM_PROTECTION = 0\.85;/);
  assert.match(pageHero, /Math\.max\(\s*MINIMUM_PROTECTION,/);
});

test("the breadcrumb is a line of text under the heading, not a corner chip", () => {
  // The comp sets heading, breadcrumb and subtitle as one left-aligned block:
  // "Home » About Us", the link in a light green with an underline, the
  // current page in white. It was a white chip pinned bottom-right and
  // hanging out of the band, which put the page's own name as far from its
  // heading as the banner allows.
  assert.match(pageHero, /<nav aria-label="Breadcrumb" className="mt-3">/);
  assert.match(pageHero, /text-brand-tint underline underline-offset-4/);
  assert.match(pageHero, /&raquo;/);
  assert.doesNotMatch(pageHero, /rounded-b-none|self-end/, "no corner chip");
  assert.doesNotMatch(pageHero, /bg-surface px-4 py-2/, "and it is not a white pill any more");

  // Where it sits changed; what it is did not.
  assert.match(pageHero, /aria-current="page"/);
  assert.match(pageHero, /<ol className=/);
});

test("the heading has no rule under it, because the comp draws none", () => {
  assert.doesNotMatch(pageHero, /h-0\.5 w-16 bg-gold/);
});

test("the banner comes out the height the comp draws", () => {
  // 296px at 1280-equivalent (237px of a 1024 frame). With `lg:pt-16` and
  // `lg:pb-16` around a 48px heading, a 24px breadcrumb line and two 18px
  // subtitle lines, ours computes to about 294 — so the existing padding is
  // already right and this is here to stop it drifting.
  assert.match(pageHero, /pb-12 pt-12 lg:pb-16 lg:pt-16/);
  assert.match(pageHero, /text-3xl font-bold leading-tight text-ink-inverse sm:text-4xl lg:text-5xl/);
});

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
  // Quality names the resolved block rather than inlining the lookup, so both
  // halves are asserted: it still reads the editable block, and still passes
  // it to the heading.
  assert.match(quality, /blockFor\(all, "certifications"\)/);
  assert.match(quality, /block=\{certificationsBlock\}/);
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
  // Quality guards on `processSteps`, which is `itemsOf(process)` resolved
  // against the temporary design fixture — the same guard, on the resolved
  // list, so the section is still absent when there is nothing to draw.
  assert.match(quality, /const processSteps = orFixture\(itemsOf\(process\)/);
  assert.match(quality, /\{processSteps\.length \? \(/);
  assert.match(about, /\{itemsOf\(manufacturing\)\.length \? \(/);
});

test("a block and its panel can be absent independently", () => {
  // The strength block draws the manufacturing steps where a block would put
  // its image. No block and the section does not render; no steps and the
  // block falls back to its own image — `undefined`, not `null`, because
  // `children ?? image` is what chooses.
  assert.match(about, /<ProcessTimeline steps=\{itemsOf\(manufacturing\)\} compact \/>\s*\n\s*\) : undefined\}/);
  assert.match(quality, /<FeatureGrid[\s\S]*?\/>\s*\n\s*\) : undefined\}/);
  assert.match(section, /\{children \?\?/);
});

test("a step is numbered by its row, not by its position", () => {
  // `step_number` is unique per group in the database and an editor reordering
  // steps changes it. Numbering from the index would renumber a step the
  // moment another was inserted above it.
  assert.match(timeline, /\{step\.step_number\}/);
  assert.doesNotMatch(timeline, /\{index \+ 1\}/);
});

test("a step with no image still reserves its box, in the same shape", () => {
  // Step 3 of About's manufacturing strip has no photograph in the reference
  // folder — the client supplied four of the five — so this is not a
  // hypothetical.
  //
  // Square in the compact strip: the About comp's tiles are 133x124, an
  // aspect of 1.07. Quality's roomier variant keeps 4:3, where the tile is
  // wide enough to read as a photograph rather than a thumbnail. Whichever it
  // is, the fallback tile and the image must agree, or the row jumps as
  // pictures load.
  assert.match(timeline, /aspectRatio=\{compact \? "1 \/ 1" : "4 \/ 3"\}/);
  assert.match(timeline, /compact \? "aspect-square" : "aspect-\[4\/3\]"/);
});

test("the step number sits below the picture, where the comp puts it", () => {
  // It used to be `-top-3`, covering the first thing in the photograph and
  // reading as a badge *on* it rather than a number under it. The ring in the
  // page colour is what separates the disc from the image edge it straddles.
  assert.match(timeline, /absolute -bottom-3 left-1\/2 grid -translate-x-1\/2[^"]*ring-4 ring-surface/);
  assert.match(timeline, /compact \? "mt-6 text-xs" : "mt-8 text-base"/, "and the title clears it");
});

test("the connectors are decorative, and as wide as the gap they cross", () => {
  // A list item whose only content is a rule is an item with no content, and
  // a screen reader counts it as a sixth step — so it is drawn inside the
  // step it leads away from.
  assert.match(timeline, /separated \? \(/);
  assert.match(timeline, /aria-hidden="true"[\s\S]*?<ChevronRight/);
  assert.match(timeline, /separated=\{index < steps\.length - 1\}/, "and the last step has none");

  // The gutter is declared once on the list and read by each connector, so
  // the dotted rule is exactly as wide as the space it has to cross. Writing
  // the number in both places is how the two drift apart.
  assert.match(timeline, /\[--process-gap:1\.5rem\]/);
  assert.match(timeline, /sm:gap-x-4 sm:\[--process-gap:1rem\]/);
  assert.match(timeline, /w-\(--process-gap\)/);

  // Level with the badge, not with the top of the picture: the comp runs the
  // arrows between the numbers.
  assert.match(timeline, /absolute bottom-\[2px\] left-full/);
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
  assert.match(quality, /<FeatureGrid[\s\S]*?items=/);
});

// ── A7: the About comp's leaf watermarks ─────────────────────────────────

const watermark = strip(read("components/content/LeafWatermark.jsx"));

test("the two bands the comp draws leaves on are the two that get them", () => {
  // Our Company on the left, Foundations on the right, matching both the comp
  // and the filenames the client supplied.
  assert.match(about, /watermark=\{\{ src: "\/about-us-our-company-left\.png", side: "left" \}\}/);
  assert.match(about, /src="\/about-us-our-foundation-right-side\.png"[\s\S]*?side="right"/);
});

test("the art is opt-in, so the sections sharing the component keep none", () => {
  // `PageBlockSection` also draws About's "Our Strength" and Quality's
  // commitment block. The comp gives neither of them leaves, and a watermark
  // switched on inside the component would put them on all three.
  assert.match(section, /watermark && "relative isolate overflow-hidden"/);
  assert.match(section, /\{watermark \? <LeafWatermark/);
  assert.doesNotMatch(quality, /LeafWatermark|watermark=/);

  // One call site per band, and "Our Strength" is not one of them.
  assert.equal((about.match(/watermark=|<LeafWatermark/g) ?? []).length, 2);
});

test("the leaves multiply, because the files have no alpha channel", () => {
  // Both PNGs are colour type 2 — RGB, opaque. They are not cut-outs; they are
  // near-white rectangles with leaves painted on. Composited normally each one
  // covers its band with a patch of white and the edge of that patch shows on
  // any background that is not pure white.
  //
  // Multiply is base x overlay, so white leaves the band untouched. Drop it
  // and the tone set on the section is painted and then hidden.
  assert.match(watermark, /mix-blend-multiply/);
  // The blend has to stop at the band, or it reaches the page behind it.
  assert.match(section, /relative isolate overflow-hidden/);
});

test("the art is measured from the container, so it never crosses the text", () => {
  // The comp puts both sprigs in the margin outside the content: Our Company's
  // runs x 0..68 of a 1024 frame where the text column starts at x=80. Our
  // container caps at 1280, so that margin only exists above 1280 and a fixed
  // width would put leaves through the first line of every paragraph.
  //
  // Measured at 1536 after this: the worst background local to a glyph in the
  // Our Company body is rgb(247,249,247) — the band itself, untouched by the
  // leaf — for 5.45 against `ink-muted`.
  assert.match(watermark, /calc\(\(100vw-min\(100vw,1280px\)\)\/2\+9rem\)/);
  assert.match(watermark, /calc\(\(100vw-min\(100vw,1280px\)\)\/2\+12rem\)/);

  // Nothing below `lg`: there is no margin to sit in and the comp does not
  // draw it there.
  assert.match(watermark, /hidden opacity-65 mix-blend-multiply lg:block/);
});

test("each sprig sits where the comp puts it vertically", () => {
  // Our Company's opens with the band (y 315 against a band opening at 300);
  // the Foundations one is level with the cards (y 643..773 of 600..863).
  assert.match(watermark, /align === "middle" \? "top-1\/2 -translate-y-1\/2" : "top-0"/);
  assert.match(about, /align="middle"/);
});

test("the two bands step apart the way the comp does", () => {
  // Sampled off the comp: Our Company is rgb(248,248,248) and Foundations is
  // rgb(240,243,239) — deeper and a shade greener. The page had white over
  // `ground`, which put the step the wrong way round.
  assert.match(about, /tone="ground"\s*\n?\s*watermark=\{\{ src: "\/about-us-our-company-left/);
  assert.match(about, /bg-ground-warm py-\(--space-section\)/);
});

test("it is decoration, and announced as none", () => {
  assert.match(watermark, /alt=""/);
  assert.match(watermark, /aria-hidden="true"/);
  assert.match(watermark, /pointer-events-none/);
  assert.match(watermark, /loading="lazy"/);
});
