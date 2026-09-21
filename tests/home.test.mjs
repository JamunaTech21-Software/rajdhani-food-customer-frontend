import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { CONTAINER_MAX, SIZES } from "../src/lib/cloudinary.js";
import { formatDate, toDate } from "../src/lib/format.js";

const SRC = fileURLToPath(new URL("../src", import.meta.url));
const read = (path) => readFileSync(join(SRC, path), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const page = strip(read("pages/HomePage.jsx"));
const hero = strip(read("components/home/Hero.jsx"));
const stats = strip(read("components/home/StatsBand.jsx"));
const card = strip(read("components/ProductCard.jsx"));

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(js|jsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const homeFiles = walk(join(SRC, "components/home")).map((p) => ({
  path: relative(SRC, p).replaceAll("\\", "/"),
  source: strip(readFileSync(p, "utf8")),
}));

// ── Criterion 1: one round trip ───────────────────────────────────────────

test("the page owns every request, and no band fetches for itself", () => {
  // RTPP-59 said one request. It is two since H1 — `ProcessStep` is not in the
  // home payload, because the public endpoint did not exist when that payload
  // was designed. Both are owned by the page, which is the part that matters:
  // a band that fetches for itself is how one round trip becomes six, and it
  // is also how a band stops being renderable from a test.
  assert.match(page, /publicApi\.get\("\/public\/home"\)/);
  assert.match(page, /useProcessSteps\("FROM_GARDEN_TO_CUP"\)/);

  for (const file of homeFiles) {
    assert.doesNotMatch(file.source, /useQuery|publicApi|api\./, `${file.path} fetches on its own`);
  }
});

test("every section is fed from the payload the page already has", () => {
  for (const prop of ["data.banners", "data.featured_products", "data.stats", "data.testimonials", "data.news"]) {
    assert.ok(page.includes(prop), `${prop} is never passed to a section`);
  }
});

// ── Criterion 2: hero preloaded, the rest lazy ────────────────────────────

test("the hero image is eager and everything below it is not", () => {
  // The hero is the LCP element. Lazy-loading it actively delays the metric,
  // because the browser defers the request until layout proves visibility.
  assert.match(hero, /<Slide banner=\{current\}[\s\S]*?priority \/>/);

  const news = strip(read("components/home/LatestNews.jsx"));
  assert.doesNotMatch(news, /priority/, "news covers are below the fold");

  const testimonials = strip(read("components/home/Testimonials.jsx"));
  assert.doesNotMatch(testimonials, /priority/);
});

test("CloudinaryImage defaults to lazy, so omitting priority is enough", () => {
  const image = strip(read("components/CloudinaryImage.jsx"));

  assert.match(image, /loading=\{priority \? "eager" : "lazy"\}/);
  assert.match(image, /fetchPriority=\{priority \? "high" : "auto"\}/);
});

// ── Criterion 3: reduced motion ───────────────────────────────────────────

test("the count-up is skipped entirely for reduced motion", () => {
  const hook = strip(read("hooks/useCountUp.js"));

  assert.match(hook, /prefers-reduced-motion: reduce/);
  assert.match(hook, /if \(reduced\) return undefined/);
});

test("reduced motion shows the number, it does not hide it", () => {
  // Withholding the information would be a worse failure than the animation.
  const hook = strip(read("hooks/useCountUp.js"));

  assert.match(hook, /useState\(\(\) => \{[\s\S]*?String\(value \?\? ""\)/, "final value from the first frame");
});

test("a screen reader is not read every frame of the count", () => {
  // Announcing "one, four, nine, seventeen…" is unusable. The animating number
  // is aria-hidden and the real value sits in a visually hidden sibling.
  assert.match(stats, /<span aria-hidden="true">\{display\}<\/span>/);
  assert.match(stats, /<span className="sr-only">\{stat\.value\}<\/span>/);
});

test("the count only starts when the band is actually on screen", () => {
  // The stats sit below the fold; animating on mount finishes before anyone
  // scrolls to them.
  const hook = strip(read("hooks/useCountUp.js"));

  assert.match(hook, /IntersectionObserver/);
  assert.match(hook, /observer\.disconnect\(\)/, "and only runs once");
});

// ── Data handling ─────────────────────────────────────────────────────────

test("the API's space-separated timestamps parse", () => {
  // new Date("2026-09-13 08:34:28.127") works in V8 and returns Invalid Date in
  // Safari — so the naive version renders correctly everywhere a developer
  // looks and breaks on every iPhone.
  assert.ok(toDate("2026-09-13 08:34:28.127") instanceof Date);
  assert.equal(formatDate("2026-09-13 08:34:28.127"), "13 Sept 2026");
  assert.equal(formatDate("2026-09-13T08:34:28.127Z"), "13 Sept 2026", "ISO still works");
  assert.equal(formatDate("not a date"), "—", "and garbage does not throw");
});

test("a badge colour from the API gets a readable text colour computed", () => {
  // The live data has badge_color "#C9A227" — gold. White on gold fails AA, and
  // an editor can pick any colour at all, so the foreground is derived rather
  // than assumed.
  assert.match(card, /readableOn\(product\.badge_color\)/);
  assert.match(card, /style=\{\{/, "applied as data, since Tailwind cannot generate arbitrary classes");
});

test("no section breaks when its slice of the payload is empty", () => {
  // The live payload has one banner, one news post and no promo — a section
  // with nothing in it must render nothing rather than an empty heading.
  // The guard's shape differs by payload slice — an array checks `.length`, a
  // single object (`welcome`) checks the object itself — so this looks for any
  // early return rather than one spelling.
  for (const file of homeFiles) {
    assert.match(
      file.source,
      /if \(![\w.?]+(\??\.length)?\) return null|if \(slides\.length === 0\) return null/,
      `${file.path} has no empty guard`,
    );
  }
});

test("the hero never autoplays", () => {
  // A hero that advances on its own moves the link someone was reaching for,
  // and uncontrolled motion is an §18 AA failure rather than a flourish.
  assert.doesNotMatch(hero, /setInterval|setTimeout|autoplay/i);
});

test("slider controls only exist when there is more than one slide", () => {
  // A previous/next pair over a single banner is two dead buttons in the tab
  // order. The live payload has exactly one.
  assert.match(hero, /const many = slides\.length > 1/);
  assert.match(hero, /\{many \? \(/);
});

test("className reaches the rendered image, not just the placeholder", () => {
  // The bug this pins: `className` was applied only in the no-src branch, so a
  // caller sizing the image with `size-10` was silently ignored and the img
  // kept `h-full w-full` — the 40px header logo rendered ~700px tall and shoved
  // the whole page apart. Nothing errored; it just looked wrong.
  const image = strip(read("components/CloudinaryImage.jsx"));

  assert.match(
    image,
    /className=\{cn\("block h-full w-full object-cover", className, imgClassName\)\}/,
    "the img must merge className, so a caller can size it",
  );
});

test("the header sizes its logo explicitly", () => {
  // Without an explicit size the logo inherits h-full/w-full and fills the
  // flex row. width/height attributes alone do not stop that — CSS wins.
  const headerSource = strip(read("components/layout/Header.jsx"));

  assert.match(headerSource, /className="size-9 shrink-0 sm:size-10"/);
  assert.match(headerSource, /imgClassName="object-contain"/, "a logo must not be cropped");
});

test("the header row cannot be forced wider than the viewport", () => {
  // min-w-0 lets the wordmark truncate; without it a long site name pushes the
  // row out and the page scrolls sideways on a phone.
  const headerSource = strip(read("components/layout/Header.jsx"));

  assert.match(headerSource, /min-w-0 shrink items-center/, "the brand block gives way");
  assert.match(headerSource, /truncate text-sm font-bold/, "and the wordmark truncates");
  assert.match(headerSource, /ml-auto hidden shrink-0 lg:block/, "the nav does not get squeezed");
});

// ── The bands RTPP-92 unblocked ───────────────────────────────────────────

test("the USP strip and welcome block read the new payload keys", () => {
  // RTPP-92 added usp_items, welcome and promo_banner to /public/home. They
  // must come from that same single request, not new ones.
  assert.match(page, /data\.usp_items/);
  assert.match(page, /data\.welcome/);
});

test("promo_banner is read by nothing, and that is H5's open decision", () => {
  // `WelcomeBlock` was the only consumer, and `AboutBand` replaced it because
  // the reference draws the welcome block with the counters beside it and no
  // video anywhere. The component is kept, unrendered, because deleting the
  // only consumer of a placement the admin still offers would answer D5 by
  // default. It is the client's call, not ours.
  assert.doesNotMatch(page, /promo_banner/);
  assert.doesNotMatch(page, /WelcomeBlock/);
  // Raw, not stripped: the note is a block comment, which `strip` removes.
  assert.match(read("components/home/WelcomeBlock.jsx"), /Not rendered anywhere as of H5/);
});

test("an editor-chosen icon background gets a computed foreground", () => {
  // icon_bg_color is a per-item hex from the dashboard. The live value is the
  // dark brand green, but the field takes anything — a pale choice with an
  // assumed white glyph would be invisible.
  // The row moved to FeatureGrid in RTPP-67, when Quality's commitment grid and
  // the dealer benefits got an endpoint and started drawing the same payload.
  const item = strip(read("components/content/FeatureGrid.jsx"));

  assert.match(item, /readableOn\(colour\)/);
  assert.match(item, /backgroundColor: colour/);
  assert.match(strip(read("components/home/UspStrip.jsx")), /<FeatureItem key=\{item\.id\}/);
});

test("an uploaded USP icon wins over a named one", () => {
  // The admin allows either; preferring the name would ignore a deliberate
  // upload.
  assert.match(strip(read("components/content/FeatureGrid.jsx")), /item\.icon\?\.url \?/);
});

test("the welcome body is rendered as the sanitised HTML it is", () => {
  // RichText::sanitize() runs server-side and the schema says so. Re-sanitising
  // here would be theatre — the server is the authority.
  //
  // The text column moved to PageBlockBody in RTPP-67: About and Quality render
  // the same PageBlock payload, and one renderer is how the three stay in step.
  const welcome = strip(read("components/home/WelcomeBlock.jsx"));
  const body = strip(read("components/content/PageBlockSection.jsx"));
  const richText = strip(read("components/content/RichText.jsx"));

  assert.match(welcome, /<PageBlockBody block=\{block\} headingId="welcome-heading" \/>/);
  assert.match(body, /<RichText html=\{block\.body\}/);
  assert.match(richText, /dangerouslySetInnerHTML=\{\{ __html: html \}\}/);
});

test("the video iframe only exists while the modal is open", () => {
  // A hidden YouTube frame loads its player, sets cookies and runs scripts on
  // every page view whether or not anyone watches.
  const welcome = strip(read("components/home/WelcomeBlock.jsx"));

  assert.match(welcome, /Dialog\.Content/);
  const contentAt = welcome.indexOf("Dialog.Content");
  const iframeAt = welcome.indexOf("<iframe");
  assert.ok(iframeAt > contentAt, "the iframe must be inside the dialog content");
});

test("both new bands disappear cleanly when their content is unpublished", () => {
  // Live right now: welcome is null and promo_banner is []. Neither may render
  // an empty heading or crash.
  const usp = strip(read("components/home/UspStrip.jsx"));
  const welcome = strip(read("components/home/WelcomeBlock.jsx"));

  assert.match(usp, /if \(!items\?\.length\) return null/);
  assert.match(welcome, /if \(!block\) return null/);
  assert.match(welcome, /promo\?\.\[0\] \?\? null/, "a missing promo falls back, not throws");
});

test("every icon the live payload names is registered", async () => {
  // Three have already been missed this way — calendar, map and mountain each
  // fell back to a neutral glyph without erroring.
  const { REGISTRY } = await import("../src/components/ui/icon-registry.js");

  for (const name of ["mountain", "coffee", "shield-check", "truck", "calendar", "map", "users", "leaf"]) {
    assert.ok(name in REGISTRY, `"${name}" is used by live data but not registered`);
  }
});

// ── H1: "From Garden To Your Cup" ─────────────────────────────────────────

const processBand = strip(read("components/home/ProcessBand.jsx"));

test("the process band reads the group the API's own enum names", () => {
  // `FROM_GARDEN_TO_CUP` is one of five the validator accepts, and it is
  // literally the band's heading. Anything else is a 422, not an empty list.
  assert.match(page, /useProcessSteps\("FROM_GARDEN_TO_CUP"\)/);
  assert.match(processBand, /From Garden To Your Cup/);
  assert.match(processBand, /Our Process/);
});

test("the stale 'no public endpoint' note is gone from the page", () => {
  // It stopped being true when RTPP-67 shipped GET /public/process-steps, and
  // a comment explaining why a band is absent is worse than no comment once
  // the band is there.
  assert.doesNotMatch(page, /no public endpoint/);
  assert.doesNotMatch(page, /still absent/);
});

test("the band sits between the stats and the testimonials", () => {
  // The reference order: products, about + stats, process, dealer, then
  // testimonials beside news.
  const names = [...page.matchAll(/^\s*(?:\{ )?name: "(\w+)",/gm)].map((m) => m[1]);

  assert.equal(names.indexOf("process"), names.indexOf("about") + 1);
  assert.ok(names.indexOf("process") < names.indexOf("voices"), "before the quotes and news");
});

test("the band is wrapped by its own boundary like every other", () => {
  // It is in SECTIONS, not rendered beside it, so RTPP-72's per-band boundary
  // covers it. A band added outside that list silently loses its boundary.
  assert.match(page, /name: "process",/);
  assert.match(page, /label: "Our process could not be shown"/);
});

test("the second request is merged in, not passed down a separate path", () => {
  // Every band reads one object, so none of them has to know which request
  // its data arrived on — and folding the group into /public/home later is a
  // one-line change here.
  assert.match(page, /process_steps: itemsOf\(process\)/);
  assert.match(page, /<ProcessBand steps=\{data\.process_steps\} \/>/);
});

test("an unpublished group renders nothing rather than an empty heading", () => {
  // Three of the five groups the API accepts are empty today.
  assert.match(processBand, /if \(!steps\?\.length\) return null/);
});

test("the connector is decoration, not a sixth step", () => {
  // Drawn inside the step it leads away from: a list item whose only content
  // is a rule is an item with no content, and a screen reader would count it.
  assert.match(processBand, /aria-hidden="true"/);
  assert.match(processBand, /connected=\{index < steps\.length - 1\}/);
  assert.match(processBand, /border-dotted/);
});

test("the connector only appears once the five are in one row", () => {
  // Between two stacked steps a horizontal rule points nowhere.
  assert.ok(processBand.includes("border-t-2 border-dotted border-brand/40 lg:block"));
  // Five across from `md` — the mobile reference runs them in one row, and
  // three on a phone is as close as 358px of content gets to that with the
  // titles still on two lines rather than one word each. The connector still
  // waits for `lg`, where the row is settled and the photograph is beside it.
  // Five across at every width now. The client asked for the mobile
  // reference literally, and the reference fits five on a phone by dropping
  // the descriptions — 358px over five steps and four 4px gaps is 68px each,
  // which holds a 48px mark and a two-line title but no prose.
  assert.match(processBand, /grid-cols-5 gap-x-1/);
});

test("the mark is white inside a green ring, as the reference draws it", () => {
  // It was a filled mint disc with a ring at 10% opacity, so the outline was
  // invisible and each step read as a soft blob rather than a mark on the
  // line running through it. The fill must stay opaque either way — it is
  // what stops the dotted rule showing through the circle.
  // `includes`, not a regex: the class list contains a `/`, which closes a
  // regex literal and turns the rest of the line into flags.
  assert.ok(
    processBand.includes(
      "relative z-10 grid size-12 place-items-center rounded-full border border-brand/40 bg-surface text-brand",
    ),
  );
  assert.doesNotMatch(processBand, /bg-brand-tint/);
});

test("the band carries the reference's tea-picker photograph", () => {
  // A fixed asset, not a field: `ProcessStep.image` is per-step and the banner
  // placement enum has no `HOME_PROCESS`, so there is nothing in the CMS an
  // editor could set it from.
  assert.match(processBand, /src="\/home-our-process-right\.png"/);
  assert.doesNotMatch(processBand, /image = null|image\?\.url/, "the unused prop is gone");
});

test("the photograph is described, unlike the About band's watermark", () => {
  // It is a photograph of someone picking tea, not an ornament, and it says
  // something the five steps do not. An empty alt is right for a border
  // flourish and wrong for this.
  assert.match(processBand, /alt="A tea picker gathering fresh leaves/);
  assert.doesNotMatch(processBand, /aria-hidden="true"[\s\S]{0,80}<img|<img[\s\S]{0,120}alt=""/);
});

test("content left, photograph right, from lg upwards", () => {
  // It used to wait for `xl`, which is 1280 *CSS* pixels — and Windows
  // display scaling at 125-150% puts a 1900-pixel window at 1267-1520, so a
  // scaled laptop could land just under it and get no photograph at all.
  assert.ok(processBand.includes("lg:block lg:w-[calc((100vw-min(100vw,1280px))/2+16rem)]"));
  assert.ok(processBand.includes("xl:w-[calc((100vw-min(100vw,1280px))/2+22rem)]"));
  assert.match(processBand, /loading="lazy"/);
});

test("the text is held off the photo by max-width, never by percentage padding", () => {
  // The bug this pins. Percentage *padding* resolves against the containing
  // block — the full-bleed section — so `pr-[32%]` was 32% of the viewport:
  // 614px at 1920. The steps were crushed to 104px and a 281px gulf opened
  // between them and the photograph. A percentage `max-width` on a child
  // resolves against the capped container instead.
  assert.ok(processBand.includes("lg:max-w-[calc(100%-18rem)] xl:max-w-[calc(100%-24rem)]"));
  assert.doesNotMatch(processBand, /pr-\[\d+%\]/, "no percentage padding on a full-bleed section");
});

test("the gap between the text and the photo is the same at every width", () => {
  // Measuring the photo from the container rather than the viewport is what
  // makes this constant. Measured from the viewport, its left edge drifted
  // further from the text the wider the screen got.
  assert.match(processBand, /lg:gap-x-4 xl:gap-x-6/);

  const gaps = new Set();

  for (const vw of [1024, 1152, 1280, 1440, 1600, 1920, 2560]) {
    const xl = vw >= 1280;
    const containerW = Math.min(vw, 1280);
    const contentW = containerW - 48;
    const textW = contentW - (xl ? 384 : 288);
    const textRight = (vw - containerW) / 2 + 24 + textW;
    const photoW = (vw - containerW) / 2 + (xl ? 352 : 256);

    gaps.add(Math.round(vw - photoW - textRight));
    assert.ok((textW - (xl ? 24 : 16) * 4) / 5 > 120, `steps too narrow at ${vw}px`);
  }

  assert.deepEqual([...gaps], [56], "the gap should not move with the viewport");
});

test("the crop keeps the subject, not the background", () => {
  // The column is portrait (~419x479 at xl) and the source is 1942x809, so
  // `cover` keeps about 36% of the width. Centred that is x=32%-68%; the
  // picker is at x=64%-100%, so she was cropped out entirely and the band
  // showed blurred bushes.
  const box = { w: (1280 - 48) * 0.34, h: 112 * 2 + 255 };
  const scale = Math.max(box.w / 1942, box.h / 809);
  const visible = (box.w / scale / 1942) * 100;

  assert.ok(visible < 45, `cover keeps only ${Math.round(visible)}% of the width, so anchoring matters`);
  assert.match(processBand, /object-right/);
});

test("ProcessTimeline was not bent into doing both jobs", () => {
  // About and Quality draw the same payload as numbered cards with image
  // tiles. One component with a flag would make every future change to either
  // page reason about the other.
  const timeline = strip(read("components/content/ProcessTimeline.jsx"));

  assert.doesNotMatch(processBand, /ProcessTimeline/);
  assert.doesNotMatch(timeline, /FROM_GARDEN_TO_CUP/);
  assert.match(timeline, /step\.step_number/, "the numbered variant still numbers");
  assert.doesNotMatch(processBand, /step_number/, "the reference draws no numbers");
});

// ── H2: the product card and the carousel ────────────────────────────────

const featured = strip(read("components/home/FeaturedProducts.jsx"));

test("only the home carousel takes the reference's card", () => {
  // /products and the related-products row were signed off separately and are
  // outside this plan. One variant, not a third card.
  assert.match(featured, /variant="compact"/);
  assert.doesNotMatch(strip(read("pages/ProductsPage.jsx")), /variant=/);
  assert.doesNotMatch(strip(read("pages/ProductDetailPage.jsx")), /<ProductCard[^>]*variant=/);
});

test("the compact card leads with the tagline, the catalogue with the description", () => {
  // "Bold. Dark. Traditional." says enough at a 240px track; two lines of
  // prose do not. `tagline` is nullable, so it falls back.
  assert.match(card, /compact \? \(product\.tagline \?\? product\.short_description\) : product\.short_description/);
  assert.match(card, /compact \? "line-clamp-1" : "line-clamp-2"/);
});

test("the compact card says View Product, as the reference does", () => {
  assert.match(card, /compact \? "View Product" : "View Details"/);
});

test("the wishlist button and the badge survive both variants", () => {
  // The reference predates RTPP-69, and badge_text is live editable data —
  // "CLASSIC" is set on a product today. Neither is inside a variant branch.
  const wishlistAt = card.indexOf("<WishlistButton");
  const badgeAt = card.indexOf("{badge ? (");

  assert.ok(wishlistAt > 0 && badgeAt > 0);
  assert.doesNotMatch(card, /compact[^\n]*WishlistButton/);
  assert.doesNotMatch(card, /compact[^\n]*badge/);
});

test("the strip no longer turns into a grid, so the arrows have something to drive", () => {
  // It became a four-column grid from `lg`. The arrows the reference draws are
  // shown on exactly those screens, and would have scrolled nothing.
  assert.doesNotMatch(featured, /lg:grid-flow-row|lg:grid-cols-4|lg:overflow-visible/);
  assert.match(featured, /auto-cols-\[calc\(\(100%-1\.5rem\)\/4\)\] grid-flow-col gap-2 overflow-x-auto/);
});

test("the skeleton still mirrors the strip after that change", () => {
  // A skeleton drawing the old grid would make the page jump when the data
  // arrived, which is the one thing a skeleton exists to prevent.
  assert.doesNotMatch(page, /lg:grid-flow-row|lg:grid-cols-4/);
});

test("the arrows scroll the native container rather than replacing it", () => {
  // Keyboard scrolling, touch momentum and focus behaviour all come free from
  // the scroller; a transform-based slider gives every one of them back up.
  assert.match(featured, /strip\.scrollBy\(\{/);
  assert.doesNotMatch(featured, /translateX|transform:/);
});

test("a step is measured, not assumed to be 260px", () => {
  assert.match(featured, /card\.getBoundingClientRect\(\)\.width \+ gap/);
  assert.match(featured, /getComputedStyle\(strip\)\.columnGap/);
});

test("the arrows read the overflow the fade mask already measures", () => {
  // Same question asked twice; asking it twice two different ways is how the
  // fade and the buttons end up disagreeing at an edge.
  assert.match(featured, /stripProps\["data-overflow-start"\]/);
  assert.match(featured, /stripProps\["data-overflow-end"\]/);
});

test("smooth scrolling is not forced on someone who asked for less motion", () => {
  // `behavior` passed to scrollBy overrides the CSS that respects the query.
  assert.match(featured, /prefers-reduced-motion: reduce/);
  assert.match(featured, /\? "auto" : "smooth"/);
});

test("the arrows are beside the cards, not on top of them", () => {
  // The reference draws them in the margin next to the strip. They used to be
  // absolutely positioned, which meant either covering the outermost card or
  // hanging past the container and giving the page a horizontal scrollbar
  // (G1). As flex siblings they take their own width and neither can happen.
  assert.doesNotMatch(featured, /absolute|-left-|-right-/);
  assert.match(featured, /shrink-0 place-items-center rounded-full/);
  assert.match(featured, /<div className="mt-8 flex items-center gap-3">/);
});

test("the strip can shrink inside that row", () => {
  // Without `min-w-0` a grid of six tracks reports its content width as its
  // minimum and shoves the right-hand arrow off the container.
  assert.match(featured, /grid min-w-0 flex-1 auto-cols-/);
});

test("each arrow is a 44px target with a name", () => {
  assert.match(featured, /size-11/);
  assert.match(featured, /aria-label=\{next \? "Show more products" : "Show previous products"\}/);
});

test("the DOM order is the order they are drawn in", () => {
  // Previous, strip, next. They were both after the strip when they were an
  // overlay, which no longer matches where they appear — and a screen-reader
  // user meeting "previous" after the list it rewinds has to reconstruct the
  // layout from nothing.
  assert.ok(featured.indexOf('direction="previous"') < featured.indexOf("ref={stripRef}"));
  assert.ok(featured.indexOf('direction="next"') > featured.indexOf("ref={stripRef}"));
});

test("the range heading and View All share a line on a phone", () => {
  // They wrapped: a 30px heading is about 280px on its own and the
  // full-length button another 180px, against the 358px a 390 phone has. The
  // heading drops a step below `sm` and the button loses its last word, which
  // brings the pair to roughly 293px. Tablet and desktop are untouched.
  assert.match(featured, /text-lg font-bold text-ink sm:text-4xl/);
  // `includes`, not a regex: the markup contains a `/`, which closes a regex
  // literal and turns the rest of the line into flags.
  assert.ok(
    featured.includes(`View All<span className="sr-only sm:not-sr-only sm:inline"> Products</span>`),
    "the last word is hidden on a phone, not deleted",
  );
  // Green, not grey. Sampled off the comp: the border is #9fc2ab, the brand
  // green at about 40% over white, and the label #1f4e2b against the token's
  // #1b5e20. A grey outline with near-black text reads as a form control.
  assert.match(featured, /whitespace-nowrap rounded-md border border-brand\/40 px-3 text-xs font-medium text-brand/);
  assert.doesNotMatch(featured, /border-line px-5 text-sm font-medium text-ink/, "not the grey one");

  // No `flex-wrap` on the row. At 320 the pair still does not fit, and
  // wrapping would drop the button under the heading — the thing being fixed.
  // Without it the heading takes two lines and the button stays beside it.
  assert.match(featured, /<div className="flex items-end justify-between gap-3 sm:gap-4">/);
  assert.match(featured, /<div className="min-w-0">/, "so the heading can shrink rather than push");

  // The last word stays in the accessible name at every width — WCAG 2.5.3
  // wants the name to contain the visible text, and it does.
  assert.doesNotMatch(featured, /aria-label="View/, "the name comes from the text, not an override");
});

test("six across at xl, and the card width follows the row", () => {
  // The reference draws six. A fixed card width would have to be recomputed
  // by hand every time the arrows changed size, and be silently wrong in
  // between; a percentage of the strip follows it.
  assert.match(featured, /xl:auto-cols-\[calc\(\(100%-100px\)\/6\)\]/);
  assert.equal(SIZES.carouselCard, "(min-width: 1280px) 170px, (min-width: 640px) 240px, 84px");
});

test("that 170px is the arithmetic, not a guess", () => {
  // container 1232 − two 44px arrows − two 12px gaps = 1120 for the strip;
  // less five 20px gaps, over six tracks.
  const strip = CONTAINER_MAX - 48 - 2 * 44 - 2 * 12;

  assert.equal(Math.round((strip - 5 * 20) / 6), 170);
});

// ── H3: the dealer bar ───────────────────────────────────────────────────

const dealerCta = strip(read("components/home/DealerCta.jsx"));

test("the dealer bar draws the same banner the catalogue does", () => {
  // One row, edited once, appearing in two places. The live record is
  // "Interested in a dealership?" → /dealer.
  assert.match(page, /placement: "DEALER_CTA"/);
  assert.match(page, /dealer_cta: dealer\.data\?\.items\?\.\[0\] \?\? null/);
  assert.match(dealerCta, /banner\.primary_cta_label/);
  assert.match(dealerCta, /banner\.primary_cta_url/);
});

test("it shares one cache entry with /products", () => {
  // Same query key, so a visitor who lands here and then opens the catalogue
  // does not fetch the banner twice.
  const products = strip(read("pages/ProductsPage.jsx"));
  const key = /queryKey: \["public", "banners", "DEALER_CTA"\]/;

  assert.match(page, key);
  assert.match(products, key);
});

test("BulkSupplyCta was not bent into doing both jobs", () => {
  // /products draws a pale card with the banner's image on one side; the
  // reference wants a solid brand bar. A variant would make every later change
  // to one reason about the other. The shared thing is the payload.
  const bulk = strip(read("components/products/BulkSupplyCta.jsx"));

  assert.doesNotMatch(dealerCta, /BulkSupplyCta/);
  assert.doesNotMatch(bulk, /export function BulkSupplyCta\(\{ banner, variant/);
  assert.match(bulk, /bg-ground-warm/, "the catalogue's block is still the pale one");
  assert.match(dealerCta, /bg-brand/, "and the home one is the solid bar");
});

test("no copy is written into the component", () => {
  // Everything a visitor reads is the banner's, so it is editable without a
  // deploy — including the heading, which the reference words differently from
  // the live record.
  assert.doesNotMatch(dealerCta, /Become Our Distributor/);
  assert.match(dealerCta, /\{banner\.title\}/);
  assert.match(dealerCta, /\{banner\.subtitle\}/);
});

test("an unscheduled banner renders nothing", () => {
  // Which is also how the band respects the banner's own starts_at/ends_at:
  // the API does not return one outside its window.
  assert.match(dealerCta, /if \(!banner\?\.title\) return null/);
});

test("a banner with no CTA still renders, without a dead button", () => {
  // secondary_cta_label is null on the live record, and primary could be too.
  assert.match(dealerCta, /!label \|\| !url \? null :/);
});

test("the handshake is decoration, not a field nobody set", () => {
  // The banner carries no icon, and this band is one fixed thing rather than a
  // list of varying ones.
  assert.match(dealerCta, /aria-hidden="true"[\s\S]{0,120}<Handshake/);
});

test("a highlight on the bar is gold, not a lighter green", () => {
  // On a solid brand bar a tint of the same hue is not a highlight.
  assert.match(dealerCta, /text-gold/);
});

test("the bar sits between the process band and the testimonials", () => {
  const names = [...page.matchAll(/^\s*(?:\{ )?name: "(\w+)",/gm)].map((m) => m[1]);

  assert.equal(names.indexOf("dealer"), names.indexOf("process") + 1);
  assert.ok(names.indexOf("dealer") < names.indexOf("voices"), "before the quotes and news");
});

test("the page still owns every request", () => {
  // Three now. The rule that matters is unchanged: no band fetches for itself.
  assert.match(page, /const home = useQuery/);
  assert.match(page, /const process = useProcessSteps/);
  assert.match(page, /const dealer = useQuery/);
  assert.doesNotMatch(dealerCta, /useQuery|publicApi/);
});

// ── H6: testimonials as a carousel ───────────────────────────────────────

const quotes = strip(read("components/home/Testimonials.jsx"));

test("one quote at a time, not a three-up grid", () => {
  // Three are published and they are very different lengths; a row of three
  // gave none of them the width to be read.
  assert.doesNotMatch(quotes, /grid-cols/);
  assert.match(quotes, /items\[Math\.min\(index, items\.length - 1\)\]/);
});

test("the carousel logic is the hero's, not a second copy", () => {
  // Wrapping at both ends and deciding whether a drag was a swipe are the two
  // things carousels get wrong, and both are already written and tested.
  assert.match(quotes, /import \{ advance, swipeIntent \} from "\.\.\/\.\.\/lib\/carousel\.js"/);
  assert.doesNotMatch(quotes, /function advance|function swipeIntent/);
});

test("a mouse drag across a quote is a selection, not a swipe", () => {
  assert.match(quotes, /event\.pointerType === "mouse" \? null :/);
});

test("it never advances on its own", () => {
  // A panel that moves the thing someone is reading is an AA failure, not a
  // flourish — the same reason the hero has no autoplay.
  assert.doesNotMatch(quotes, /setInterval|setTimeout|autoplay/i);
});

test("the dots only exist when there is more than one", () => {
  assert.match(quotes, /const many = items\.length > 1/);
  assert.match(quotes, /\{many \? \(/);
});

test("each dot is a 24x44 target that says which one it is", () => {
  // The button is the target; the 8px span is the dot the reference draws.
  // It was 16px wide — see the sweep note in responsive.test.mjs.
  assert.match(quotes, /className="group grid h-11 w-6 place-items-center"/);
  assert.match(quotes, /aria-label=\{`Show testimonial \$\{i \+ 1\} of \$\{items\.length\}`\}/);
  assert.match(quotes, /aria-current=\{i === index \? "true" : undefined\}/);
});

test("the quote element is replaced rather than mutated", () => {
  // Without the key a screen reader is not told the text under its cursor has
  // changed.
  assert.match(quotes, /<blockquote key=\{current\.id\}/);
});

test("the eyebrow is the heading, so nothing invented sits under it", () => {
  // "Trusted across Bangladesh" was written here, not by anyone who owns the
  // copy, and the reference shows no such line. Making the visible line the
  // heading keeps the outline without a hidden duplicate (R3).
  assert.doesNotMatch(quotes, /Trusted across Bangladesh/);
  assert.match(quotes, /<h2\s+id="testimonials-heading"/);
  assert.match(quotes, /aria-labelledby="testimonials-heading"/);
  assert.doesNotMatch(quotes, /sr-only">What Our Clients Say/);
});

test("the card is the reference's quiet panel, not a raised one", () => {
  // It was white-on-white with a `shadow-card`, which only read as a card
  // because of the shadow. The reference draws a pale panel on a white band.
  assert.match(quotes, /<figure className="flex flex-col rounded-xl bg-ground p-6">/);
  assert.doesNotMatch(quotes, /shadow-card|bg-surface/);
});

test("no stars and no rule above the attribution", () => {
  // Both were here; the reference has neither. `rating` is still set on every
  // row and still returned by the API — it is simply not drawn.
  assert.doesNotMatch(quotes, /Rating|Star|out of 5/);
  assert.doesNotMatch(quotes, /border-t border-line/);
  assert.match(quotes, /<figcaption className="mt-5">/);
});

test("the attribution reads as the reference sets it", () => {
  // "– Ahmed Hossain". The dash is presentation, so a screen reader is spared
  // it rather than announcing "en dash Ahmed Hossain".
  assert.match(quotes, /<span aria-hidden="true">– <\/span>/);
});

test("the dots are centred under the card", () => {
  assert.match(quotes, /mt-4 flex items-center justify-center gap-1/);
});

test("the quote is capped rather than stretched across the container", () => {
  // H7 moves this into a third of the row; until then a single quote at
  // 1232px would be a line nobody can track back from.
  assert.match(quotes, /max-w-2xl/);
});

// ── H7: the quotes beside the news ───────────────────────────────────────

const voices = strip(read("components/home/VoicesBand.jsx"));
const news = strip(read("components/home/LatestNews.jsx"));

test("the two bands became two columns of one row", () => {
  assert.match(voices, /xl:grid-cols-\[1fr_2fr\]/);
  assert.match(voices, /<Testimonials testimonials=\{testimonials\} \/>/);
  assert.match(voices, /<LatestNews posts=\{posts\} \/>/);
  assert.match(page, /<VoicesBand testimonials=\{data\.testimonials\} posts=\{data\.news\} \/>/);
});

test("neither column still owns a container, a ground or a rhythm", () => {
  // The wrapper owns all three. Two nested containers would double the gutter
  // and two lots of section padding would double the space above the row.
  for (const source of [quotes, news]) {
    assert.doesNotMatch(source, /max-w-\(--container-max\)/);
    assert.doesNotMatch(source, /py-\(--space-section\)/);
    assert.doesNotMatch(source, /pl-\(--gutter-l\)/);
  }
  assert.match(voices, /max-w-\(--container-max\)/);
  // `pt` rather than `py`: the band gives its bottom padding up to the footer
  // join. What this assertion is about is that the wrapper owns the rhythm
  // and neither column does.
  assert.match(voices, /pt-\(--space-section\)/);
});

test("the split waits for xl, where the cards are a usable width", () => {
  // Three cards inside two thirds of a 1024px container are 192px each — too
  // narrow for a cover, a date and a two-line title. Dropping to two there
  // would wrap the third onto its own row beside a single quote.
  assert.doesNotMatch(voices, /lg:grid-cols/);
  assert.match(voices, /xl:grid-cols/);
});

test("the home news card is sized for its own track, not the news page's", () => {
  // 249px in a two-thirds column against 395px full width. One string for both
  // would have been 59% over on the home page — an image and a half of wasted
  // bandwidth on the busiest route.
  assert.match(news, /sizes=\{SIZES\.homeNewsCard\}/);
  assert.notEqual(SIZES.homeNewsCard, SIZES.newsCard);
  assert.match(SIZES.homeNewsCard, /^\(min-width: 1280px\) 249px,/);
});

test("the arithmetic behind that 249px still holds", () => {
  // container 1232 − row gap 40 = 1192; two thirds = 794.67; less two 24px
  // gaps = 746.67; over three = 248.9. If the row gap or the grid gap changes,
  // this is the line that says so.
  const track = ((CONTAINER_MAX - 48 - 40) * 2) / 3;
  assert.equal(Math.round((track - 48) / 3), 249);

  assert.match(voices, /xl:gap-10/, "the 40px row gap");
  assert.match(news, /grid gap-6/, "the 24px grid gap");
});

test("below xl the home card is sized exactly as the news page's is", () => {
  // Same full-width grid, so every step below the top one must agree — a
  // divergence there would be a copy that drifted rather than a decision.
  const tail = (value) => value.split(", ").slice(1).join(", ");

  assert.equal(tail(SIZES.homeNewsCard), tail(SIZES.newsCard));
});

test("the news band's invented heading went the same way as the quotes'", () => {
  // "From the garden and the factory" was written here, not by anyone who owns
  // the copy, and the reference shows no line under the eyebrow.
  assert.doesNotMatch(news, /From the garden and the factory/);
  assert.match(news, /<h2\s+id="news-heading"/);
  assert.match(news, /aria-labelledby="news-heading"/);
});

test("the home news card drops the excerpt, and /news keeps it", () => {
  // F13. At 249px, three lines of excerpt under a two-line title is a column
  // of text nobody reads on the way past.
  assert.doesNotMatch(news, /post\.excerpt/);
  assert.match(strip(read("components/news/NewsCard.jsx")), /excerpt/, "the listing card still has it");
});

test("the row disappears only when both halves are empty", () => {
  // One published news post and three testimonials today; either could empty
  // without the other.
  assert.match(voices, /const anything = \(testimonials\?\.length \?\? 0\) \+ \(posts\?\.length \?\? 0\);/);
  assert.match(voices, /if \(!anything\) return null/);
});

// ── H5: the welcome text with the counters beside it ─────────────────────

const about = strip(read("components/home/AboutBand.jsx"));

test("the welcome block and the counters are one band now", () => {
  assert.match(page, /<AboutBand block=\{data\.welcome\} stats=\{data\.stats\} \/>/);
  assert.match(about, /lg:grid-cols-2/);
  assert.match(about, /<PageBlockBody block=\{block\}/);
  assert.match(about, /<Stat key=\{stat\.id\} stat=\{stat\} \/>/);
});

test("the counter itself is shared, not copied", () => {
  // The counting, the observer and the aria arrangement should exist once.
  assert.match(about, /import \{ Stat \} from "\.\/StatsBand\.jsx"/);
  assert.doesNotMatch(about, /useCountUp|IntersectionObserver/);
});

test("the About page's own stats band still works", () => {
  // It renders a second one from group ABOUT, so the band could not simply
  // become home-specific.
  const band = strip(read("components/home/StatsBand.jsx"));

  assert.match(band, /export function StatsBand/);
  assert.match(band, /export function Stat/);
  assert.match(
    strip(read("pages/AboutPage.jsx")),
    /<StatsBand stats=\{itemsOf\(stats\)\} label="Rajdhani in numbers" tone="dark" \/>/,
  );
});

test("the band has two tones, and the pages do not share one", () => {
  // The About comp draws this band in brand green with white figures and
  // hairline dividers; the home comp draws green figures on a tint beside the
  // welcome text. One component, two tones — the alternative was a second
  // component that would drift the first time either comp changed.
  //
  // `bg-brand-dark` because the About comp's band samples at #024517, against
  // #144a18 for brand-dark, #1b5e20 for brand and #0d3411 for brand-deep.
  const band = strip(read("components/home/StatsBand.jsx"));

  assert.match(band, /dark \? "bg-brand-dark" : "bg-ground-warm"/);
  assert.match(band, /dark \? "border border-ink-inverse\/40 text-ink-inverse" : "bg-brand-tint text-brand"/);
  assert.match(band, /dark \? "text-ink-inverse" : "text-brand"/);

  // The dividers wait for the single row, for the reason UspStrip records: at
  // two columns the third item starts a row and a left border there draws a
  // line down the middle of nothing.
  assert.match(band, /md:gap-0 md:divide-x md:divide-ink-inverse\/20/);
  assert.doesNotMatch(band, /\bdivide-x\b(?<!md:divide-x)/, "never unprefixed");

  // The home page keeps the pale one: `tone` is not passed there at all.
  assert.doesNotMatch(strip(read("components/home/AboutBand.jsx")), /tone="dark"/);
});

test("the band survives either half being missing", () => {
  // Which matters today: `welcome` is null and four stats are published, so
  // what renders right now is the counters alone — as the page showed before.
  assert.match(about, /const anything = hasText \|\| hasStats;/);
  assert.match(about, /if \(!anything\) return null/);
  assert.match(about, /\{hasText \? <PageBlockBody/);
  assert.match(about, /\{hasStats \? \(/);
});

test("the split and the rule only appear when both halves are there", () => {
  // A rule down the middle of a band with one empty half looks like a bug.
  assert.match(about, /const split = hasText && hasStats;/);
  assert.match(about, /split && "lg:grid-cols-2 lg:items-center lg:gap-14"/);
  assert.match(about, /split && "lg:border-l lg:border-line lg:pl-14"/);
});

test("the band is named whichever half it has", () => {
  // The About page shows a second stats band; two landmarks with one name
  // cannot be told apart.
  assert.match(about, /aria-labelledby=\{block\?\.heading \? "about-band-heading" : undefined\}/);
  assert.match(about, /aria-label=\{block\?\.heading \? undefined : "Rajdhani by the numbers"\}/);
});

test("the block's image is not drawn here", () => {
  // The reference gives the right column to the numbers. About and Quality
  // still draw `block.image`, which is where that field is used.
  assert.doesNotMatch(about, /block\.image|CloudinaryImage/);
});

test("the text column is the same renderer About and Quality use", () => {
  // One place decides how an eyebrow, a heading, a body and a CTA are drawn.
  assert.match(about, /import \{ PageBlockBody \} from "\.\.\/content\/PageBlockSection\.jsx"/);
});

// ── The audit: two gaps the phases missed ────────────────────────────────

test("the USP strip has the rules the reference draws between its four", () => {
  // F11, which was recorded as a finding and then never assigned to a phase.
  const usp = strip(read("components/home/UspStrip.jsx"));

  assert.match(usp, /lg:divide-x lg:divide-line/);
  assert.match(usp, /lg:gap-0/, "the rule replaces the gap rather than sitting beside it");
});

test("those rules wait for the single row", () => {
  // At `sm:grid-cols-2` the third item *starts* a row, and `divide-x` skips
  // only the first child — so a rule there would be drawn down the middle of
  // nothing.
  const usp = strip(read("components/home/UspStrip.jsx"));

  assert.doesNotMatch(usp, /\bdivide-x\b(?<!lg:divide-x)/, "never unprefixed");
  // Two across from the smallest width now, as the mobile reference draws
  // them — the rules still wait for the single row at `lg`.
  assert.match(usp, /grid-cols-2 gap-6[^"]*sm:p-8 lg:grid-cols-4/);
});

test("the dealer bar is joined to the process band, not floating between two", () => {
  // In the comp the photograph's bottom edge and the bar's top edge are the
  // same line — y=1100 and y=1102 of a 1024-wide frame — and the two read as
  // one composition because of it.
  //
  // The bar still owns no vertical space itself; what changed is which
  // neighbour gives it. Above is `ProcessBand`'s `pb-6`, the comp's own 24px
  // scaled to our container; below is the quotes band's full section.
  const dealer = strip(read("components/home/DealerCta.jsx"));
  const process = strip(read("components/home/ProcessBand.jsx"));

  assert.doesNotMatch(dealer, /p[bty]-\(--space-section\)/, "the bar spaces itself");

  // On the `<section>`'s own class list, not the whole file — `mt-2` on the
  // subtitle is ordinary. Pulling the section up with a negative margin would
  // also close the gap, and would leave a tail of photograph showing past the
  // container on a wide screen, where the bar stops at 1280 and the photo
  // bleeds to the window.
  const section = dealer.slice(dealer.indexOf("<section"), dealer.indexOf(">", dealer.indexOf("<section")));
  assert.doesNotMatch(section, /\b-?mt-/, "the bar does not pull itself up");

  assert.match(process, /pb-6 pt-\(--space-section\)/, "the join is on the band above");
  assert.doesNotMatch(process, /py-\(--space-section\)/, "which means not `py`");
  assert.match(strip(read("components/home/VoicesBand.jsx")), /pt-\(--space-section\)/, "VoicesBand");
});

test("the photograph reaches the join, so the bar starts where it ends", () => {
  // `bottom-0` is the section's bottom edge, padding included — so shrinking
  // the padding to 24px is what puts the photo's lower edge on the bar's
  // upper one. An overlap would have done it too, and would have left a 24px
  // tail of photograph visible past the container on a wide screen, where
  // the bar stops at 1280 and the photo bleeds to the window.
  const img = processBand.slice(processBand.indexOf("<img"), processBand.indexOf("/>", processBand.indexOf("<img")));

  assert.match(img, /absolute inset-y-0 right-0/);
  assert.match(processBand, /overflow-hidden pb-6/, "and the band clips it there");
});

test("every band the page renders owns its rhythm, or is exempt on purpose", () => {
  // Derived from SECTIONS rather than from the folder, so a band added to the
  // page is covered automatically and a component that is only ever a *column*
  // — LatestNews, Testimonials — is not wrongly required to space itself.
  //
  // Three exemptions, each for a stated reason: the hero is sized by
  // `--hero-min`, the USP card is pulled up over it, and the dealer bar sits
  // in its neighbours' padding so that it is centred between them.
  const exempt = {
    Hero: /min-h-\(--hero-min\)/,
    UspStrip: /-mt-12/,
    DealerCta: /pl-\(--gutter-l\)/,
  };

  // A fourth case, and not an exemption: `ProcessBand` keeps the token above
  // and gives up its bottom padding to the 24px join with the dealer bar. It
  // is still on the rhythm — on one side of it — so it is checked, not
  // skipped.
  const joined = {
    ProcessBand: /pb-6 pt-\(--space-section\)/,
    VoicesBand: /pb-2 pt-\(--space-section\)/,
  };

  // The hero's entry spans several lines, so the component name may sit past
  // an opening paren and a newline.
  const rendered = [...new Set([...page.matchAll(/render: \(data\) => \(?\s*<(\w+)/g)].map((m) => m[1]))];
  assert.ok(rendered.length >= 7, "SECTIONS should still be readable from the source");

  for (const name of rendered) {
    const source = strip(read(`components/home/${name}.jsx`));

    if (name in exempt) {
      assert.match(source, exempt[name], `${name} is exempt, and for the stated reason`);
      assert.doesNotMatch(source, /py-\(--space-section\)/, `${name} claims to be exempt but spaces itself`);
      continue;
    }

    if (name in joined) {
      assert.match(source, joined[name], `${name} joins the band below, and on the stated terms`);
      continue;
    }

    assert.match(source, /py-\(--space-section\)/, `${name} has no vertical rhythm`);
  }
});

// ── H8: the hero, matched to the reference ───────────────────────────────

test("the headline is dark on a light hero, as the reference draws it", () => {
  // It was white over a 40% `bg-ink` scrim, with the highlight in gold.
  assert.match(hero, /font-bold leading-\[1\.1\] text-ink /);
  assert.match(hero, /<span className="block text-brand">\{banner\.title_highlight\}/);
  assert.match(hero, /text-ink-muted sm:mt-5 sm:text-base lg:text-lg/, "and the subtitle with it");
  assert.doesNotMatch(hero, /text-ink-inverse/, "nothing is still painted for a dark hero");
  assert.doesNotMatch(hero, /text-gold|bg-gold/);
});

test("the full-bleed dark scrim is gone", () => {
  assert.doesNotMatch(hero, /className="absolute inset-0 -z-10 bg-ink"/);
});

test("but legibility is still the code's job, not the next upload's", () => {
  // Removing the scrim outright would make a dark photograph plus dark text an
  // AA failure nobody notices until it is live. It is inverted and localised
  // instead: a light wash fading left to right, behind the text only.
  assert.match(hero, /lg:bg-gradient-to-r lg:from-surface lg:from-0% lg:via-surface\/60 lg:via-35% lg:to-transparent lg:to-68%/);

  // And "behind the text only" is a claim about geometry, so it only holds
  // where the geometry does. The gradient clears at 68% of the viewport; the
  // text column is `max-w-xl`, so it fits inside that only above about
  // 1050px. At 768 the text ran to 78% and on a phone to 96%, with the last
  // third of every line unprotected on the photograph.
  //
  // The flat mobile wash that fixed that is gone again, and for a better
  // reason: below `lg` the photograph is no longer behind the text at all, so
  // there is nothing to protect it from. A wash over the whole slide bought
  // legibility by spending the picture.
  assert.match(hero, /absolute inset-0 -z-10 bg-surface\/75 lg:bg-transparent lg:bg-gradient-to-r/);
  assert.doesNotMatch(
    hero,
    /className="absolute inset-0 -z-10 bg-gradient-to-r/,
    "an unprefixed gradient is the bug this test exists for",
  );
  // The flat wash is back below `lg`: the client asked for the desktop
  // composition on a phone, so the text sits over the photograph again and
  // has to be protected from it.
  assert.match(hero, /bg-surface\/75 lg:bg-transparent/);
});

test("the phone shows the product, because the arithmetic says it otherwise cannot", () => {
  // The banner is 1983x793 and the product group runs 53%..92% of its width.
  // As a full-bleed backdrop the box is 390x480 on a phone, so `object-cover`
  // scales to the height and crops the width to 32% — and a 39%-wide subject
  // does not fit a 32% window at any `object-position`. Centred, 34% of the
  // product was in frame. At 1280 the same image shows 94% of its width.
  //
  // So the box changes shape below `lg`: a 224px band under the text, which
  // shows 70% of the width, anchored at 75% to put the window at 23%..92%.
  // The product is lifted into a square of its own beside the text. A
  // full-bleed backdrop crops the width to about a third on a 390 phone and
  // the product group is 39% of the image, so it does not fit at any anchor.
  // A square box shows 40% of the width, and anchored at 87% that window is
  // 53%..93% — the whole group.
  assert.match(hero, /w-\[38%\] shrink-0 sm:w-\[44%\] lg:hidden/);
  assert.match(hero, /aspectRatio="1 \/ 1"/);
  assert.match(hero, /size-full rounded-lg object-\[87%_center\]/);

  // And the backdrop keeps the pale hillside behind the headline.
  assert.match(hero, /absolute inset-0 -z-10 size-full object-left lg:object-center/);
});

test("the admin's overlay slider still does something, but has a floor", () => {
  // It may add protection. It may not remove it — that is the one thing the
  // slider must not be able to do now the text is dark.
  assert.match(hero, /const MINIMUM_PROTECTION = 0\.8;/);
  assert.match(hero, /Math\.max\(MINIMUM_PROTECTION, Math\.min\(Math\.max\(overlayOpacity \?\? 40, 0\), 100\) \/ 100\)/);
});

test("a hero button label never wraps, and its column is wide enough not to", () => {
  // At 320 the text column was 145px against the 166px "Download Catalogue"
  // needs, so the label broke across two lines inside a fixed-height button.
  // Three changes buy the 22px: a narrower product square below `sm`, a
  // tighter row gap, and less horizontal padding on the button itself.
  //
  // `whitespace-nowrap` is the guarantee; the widths are what stop it
  // overflowing instead. Measured in a browser at 320: the button is 167px in
  // a 167px column, on one line.
  assert.match(hero, /whitespace-nowrap rounded-md px-3/);
  assert.match(hero, /w-\[38%\] shrink-0 sm:w-\[44%\]/, "the square gives the column room");
  assert.match(hero, /items-center gap-3 pb-16 pt-10 sm:gap-4/, "and so does the row gap");
});

test("the second CTA is the reference's ghost button", () => {
  // H8 asserted the opposite — "the reference's white button, not a
  // translucent one" — and it was wrong. That was read off the picture;
  // measuring it says the photograph shows straight through. Down the button
  // at x=300 of the comp: #e6dfb3, #e4deb1, #dad4a2, #d2d19d, which is the
  // same gradient as the hillside above and below it. The border at x=239
  // samples #78946d, the brand green at about 60% over that pale ground.
  assert.match(hero, /border border-brand\/60 bg-transparent text-brand hover:bg-brand/);
  assert.doesNotMatch(hero, /border-line-strong bg-surface text-ink/, "not the solid white one");

  // The original translucent version had a blur behind it and depended on the
  // hero being dark. It is not that either — the wash does the work now.
  assert.doesNotMatch(hero, /backdrop-blur-sm/);
});

test("the slider controls follow the hero from dark to light", () => {
  // A white chevron on a bright tea garden is a control nobody can see.
  assert.match(hero, /rounded-full text-ink hover:bg-ink\/10/);
  assert.match(hero, /\? "w-6 bg-brand"/);
});

test("a banner with no image gets a pale ground, not the deep green", () => {
  assert.match(hero, /className="absolute inset-0 -z-10 bg-ground"/);
  assert.doesNotMatch(hero, /bg-brand-deep/);
});

test("the other pages' heroes were not dragged along", () => {
  // `PageHero` is a different component with its own dark scrim, used by
  // About, Quality, Contact and four more. The *home* reference covers the
  // home page only, and its light treatment should not have reached them —
  // the inner pages have a comp of their own, and it keeps them dark.
  const pageHero = strip(read("components/layout/PageHero.jsx"));

  assert.match(pageHero, /lg:from-ink lg:from-0% lg:via-ink\/75 lg:via-35%/, "still an ink scrim");
  assert.match(pageHero, /text-ink-inverse/, "and still light text on it");
  assert.doesNotMatch(pageHero, /from-surface|bg-surface\/80/, "the home hero's light wash has not leaked");
});

// ── The second hero button ───────────────────────────────────────────────

const secondary = () =>
  hero.slice(hero.indexOf("function secondaryCta"), hero.indexOf("const MINIMUM_PROTECTION"));

test("the second button always renders, because the reference draws two", () => {
  assert.doesNotMatch(secondary(), /return null/, "no branch leaves the hero with one button");
  assert.match(secondary(), /label: "Download Catalogue", onClick: onDownload/);
});

test("the banner's own second CTA still wins", () => {
  const fn = secondary();

  assert.ok(fn.indexOf("banner.secondary_cta_label") < fn.indexOf('"Download Catalogue"'));
});

test("it is a button, because building the file is the action", () => {
  // There is no URL to link at — the CSV does not exist until someone asks
  // for it. Earlier passes pointed this at an uploaded PDF and then at
  // `/products`; generating the file removes both compromises.
  assert.match(hero, /<button type="button" onClick=\{onClick\} aria-busy=\{busy \|\| undefined\}/);
  assert.doesNotMatch(hero, /useDownload|DOWNLOAD_KEYS/);
  assert.doesNotMatch(page, /useDownload|DOWNLOAD_KEYS/);
});

test("aria-busy rather than disabled while it works", () => {
  // A disabled control loses focus mid-interaction, which drops a keyboard
  // user out of the hero entirely.
  assert.doesNotMatch(hero, /disabled=\{busy/);
  assert.match(page, /downloading=\{data\.catalogueState === "working"\}/);
});

test("the hero still does not fetch for itself", () => {
  // The page owns the request, as it owns every other one on the page.
  const heroFile = homeFiles.find((f) => f.path.endsWith("home/Hero.jsx"));

  assert.doesNotMatch(heroFile.source, /useQuery|publicApi/);
  assert.match(page, /useProductCatalogue\(\)/);
});

test("every product is fetched, not just the first page", () => {
  // The API caps `limit` at 100 without saying so — ask for 500 and the reply
  // comes back with `limit: 100`. One request would ship a silently truncated
  // catalogue the day the client publishes their 101st product.
  const hook = strip(read("hooks/useProductCatalogue.js"));

  assert.match(hook, /fetchAllPages\(/);
  assert.match(hook, /params: \{ page, limit \}/);
});

test("the catalogue is built on the click, not on every page load", () => {
  // It fetches every product. Doing that on load to serve a button most
  // visitors never press would make it the largest request on the page.
  const hook = strip(read("hooks/useProductCatalogue.js"));

  assert.doesNotMatch(hook, /useQuery/);
  assert.match(hook, /async function download\(\)/);
  assert.match(hook, /if \(state === "working"\) return;/, "and a double click does not save twice");
});

test("the object URL is released", () => {
  // Without it the Blob is held for the life of the document, and four
  // presses leave four copies of the catalogue in memory.
  assert.match(strip(read("hooks/useProductCatalogue.js")), /URL\.revokeObjectURL\(url\)/);
});

// ── The USP strip's marks ────────────────────────────────────────────────

test("the strip's marks are a pale wash, as the reference draws them", () => {
  // All four live items carry `icon_bg_color: "#1B5E20"` — the solid brand
  // green — so the strip rendered as four dark discs where the reference
  // shows pale mint circles with green glyphs.
  assert.match(strip(read("components/home/UspStrip.jsx")), /tone="tint"/);
});

test("Quality and the dealer benefits keep the filled disc", () => {
  // The reference covers the home page only. `FeatureGrid` serves the other
  // two, and nothing here should have reached them.
  const grid = strip(read("components/content/FeatureGrid.jsx"));

  assert.match(grid, /tone = "solid"/, "solid is still the default");
  assert.doesNotMatch(strip(read("pages/QualityPage.jsx")), /tone=/);
});

test("the editor's colour is still theirs, just drawn differently", () => {
  // Ignoring `icon_bg_color` would have been the easy fix and would have
  // silently disabled a control an editor is entitled to use. Tinted, the
  // chosen colour becomes the glyph and a pale version of it the fill.
  const grid = strip(read("components/content/FeatureGrid.jsx"));

  assert.match(grid, /const wash = shade\(colour, 0\.93, 0\.33\);/);
  assert.match(grid, /backgroundColor: wash, color: legible \? colour : readableOn\(wash\)/);
});

test("the derived wash really is the brand tint", async () => {
  // 0.93/0.33 is not a guess: it reproduces --color-brand-tint from
  // --color-brand to within one hex digit, so the brand case matches the
  // token and every other hue is treated consistently with it.
  const { shade } = await import("../src/shared/theme/color.js");

  assert.equal(shade("#1b5e20", 0.93, 0.33), "#d9efd8");
});

test("a pale editor colour does not make the glyph invisible", async () => {
  // Brand-on-its-own-tint is 6.48:1. A light yellow would wash to near-white
  // and leave nothing to see, so below WCAG 1.4.11's 3:1 for a graphical
  // object the glyph falls back to whatever reads on that wash.
  const { contrastRatio, shade } = await import("../src/shared/theme/color.js");
  const grid = strip(read("components/content/FeatureGrid.jsx"));

  assert.match(grid, /const MARK_CONTRAST_FLOOR = 3;/);
  assert.ok(contrastRatio("#1b5e20", shade("#1b5e20", 0.93, 0.33)) >= 3, "the brand passes");
  assert.ok(contrastRatio("#fff176", shade("#fff176", 0.93, 0.33)) < 3, "a pale yellow does not");
});

// ── The About band's leaf watermark ──────────────────────────────────────

test("the band carries the reference's leaf background", () => {
  const about = strip(read("components/home/AboutBand.jsx"));

  assert.match(about, /src="\/home-about-us\.png"/);
  assert.match(about, /absolute inset-0 -z-10 size-full object-cover/);
});

test("it is decoration, and announced as none", () => {
  const about = strip(read("components/home/AboutBand.jsx"));

  assert.match(about, /alt=""/);
  assert.match(about, /aria-hidden="true"/);
});

test("it is lazy, because the band is four sections down", () => {
  // And it is why the ground colour stays underneath: on a slow connection
  // the band is that colour first and the leaves fade in over it.
  const about = strip(read("components/home/AboutBand.jsx"));

  assert.match(about, /loading="lazy"/);
  assert.match(about, /bg-ground-warm/);
});

test("the background cannot shift the text as it arrives", () => {
  // Absolutely positioned, so it contributes no layout at all — the reason it
  // needs no reserved box despite being an image (G6).
  const about = strip(read("components/home/AboutBand.jsx"));

  assert.match(about, /relative isolate overflow-hidden bg-ground-warm/);
  assert.doesNotMatch(about, /<CloudinaryImage/, "a local file has nothing to negotiate");
});

test("the file is in the directory the build actually serves", () => {
  // `public/` is not Vite's public dir here — `publicDir: \"static\"`, because
  // the two comp folders under `public/` were 162 MB and were being copied
  // into every build. `public/RajdhaniPagesRequireImages/` is gitignored too,
  // so a reference to it would work on one laptop and 404 everywhere else.
  const served = readdirSync(join(SRC, "..", "static"));

  assert.ok(served.includes("home-about-us.png"));
  assert.match(readFileSync(join(SRC, "..", "vite.config.js"), "utf8"), /publicDir: "static"/);
});

test("the photograph resolves out of the band rather than butting against it", () => {
  // The reference does not put a hard edge between the white section and the
  // photo — it fades in over roughly a quarter of its width. A hard edge
  // reads as a screenshot pasted onto the page.
  assert.match(processBand, /className="fade-in-from-left absolute inset-y-0 right-0/);

  const css = readFileSync(join(SRC, "index.css"), "utf8");
  assert.match(css, /\.fade-in-from-left \{\s*mask-image: linear-gradient\(to right, transparent 0, #000 26%\);/);
});

test("the mask's black is not a colour anyone sees", () => {
  // §18.2 bans colour literals in components. In a mask `#000` means "fully
  // opaque" and must stay black whatever `primary_color` becomes — the same
  // reasoning `.scroll-fade` records directly above it.
  const css = readFileSync(join(SRC, "index.css"), "utf8");
  const at = css.indexOf(".fade-in-from-left");

  assert.match(css.slice(at - 600, at), /not a colour/);
});

test("the step description is a size down from its title", () => {
  // At the same size the two ran together and the row read as five
  // paragraphs rather than five labelled marks.
  assert.match(processBand, /text-\[0\.6875rem\] font-semibold leading-tight text-ink sm:mt-4 sm:text-sm/);
  assert.match(processBand, /<p className="mt-1 hidden text-xs leading-relaxed text-balance text-ink-muted sm:block">/);
});

test("the photograph fills the band and meets the one above and below", () => {
  // Measured, not judged: in the comp the photo's top edge is y=945 and the
  // About band's tint ends at y=944, and its bottom edge is y=1100 against
  // the dealer bar's y=1102. It is a full-height panel between two bands.
  //
  // It used to start at `top-(--space-section)` so its top sat level with
  // "OUR PROCESS", which left a white strip above it that the comp does not
  // have. There is nothing for the offset to stay level with any more, so
  // there is no offset.
  const img = processBand.slice(processBand.indexOf("<img"), processBand.indexOf("/>", processBand.indexOf("<img")));

  assert.match(img, /absolute inset-y-0 right-0/);
  assert.doesNotMatch(img, /\btop-/, "no top offset at all, token or number");
  assert.match(processBand, /pt-\(--space-section\)/, "the text still starts on the rhythm");
});

test("an absolutely positioned image is given a height, or it computes its own", () => {
  // The bug this pins, which survived five rounds of "the image is the wrong
  // size" without being found:
  //
  // Tailwind's preflight sets `height: auto` on every img. An absolutely
  // positioned *replaced* element resolves that from its width and intrinsic
  // ratio, not from its offsets — and then, with top and bottom both set, the
  // equation is over-constrained and the browser ignores `bottom`.
  //
  // The process photo is 1942x809, so in a 352px column it was 147px tall in
  // a ~300px band: pinned to the top, 150px of white underneath, and moving
  // the box could never fix it. The dealer bar's leaves are 1568x1003, which
  // at 246px came to 157px against a bar about 148px tall — near enough to
  // pass for working, and one extra line of copy from not.
  //
  // `AboutBand` had `size-full` from the start and never had the bug.
  for (const name of ["AboutBand", "ProcessBand", "DealerCta"]) {
    const source = strip(read(`components/home/${name}.jsx`));
    const images = source.match(/<img[\s\S]*?\/>/g) ?? [];

    for (const img of images) {
      const classes = img.match(/className="([^"]*)"/)?.[1] ?? "";
      if (!/\babsolute\b/.test(classes)) continue;

      assert.match(
        classes,
        /\b(h-full|size-full|inset-0 [^"]*size-full)\b/,
        `${name}: an absolute image with no height takes it from its own ratio`,
      );
    }
  }
});

test("the vertical half of object-position is not used, because it cannot work", () => {
  // The column is portrait and the source is 1942x809, so `cover` scales to
  // the *height* and crops only the width. The whole height of the photograph
  // is already on screen, which makes `object-right bottom` or `right 70%`
  // completely inert — an easy no-op to ship by accident.
  //
  // The box has changed twice since this was written — H9 cut the rhythm and
  // H11/H12 turned the photo into a full-height panel — so the height is
  // recomputed from what the band is today rather than left at the 479px it
  // was: 48px of top padding, ~229px of content, 24px of join. The margin is
  // wide enough that the conclusion survives either number, which is the
  // point of asserting it rather than remembering it.
  const box = { w: (1280 - 1280) / 2 + 352, h: 48 + 229 + 24 };
  const scale = Math.max(box.w / 1942, box.h / 809);

  assert.ok(box.h / scale >= 809 - 1, "the full height is visible, so a vertical anchor does nothing");
  assert.match(processBand, /object-cover object-right lg:block/);
  assert.doesNotMatch(processBand, /object-\[right_\d/, "no inert two-value position");
});

// ── The dealer bar's leaves ──────────────────────────────────────────────

// ── The display serif is opt-in ──────────────────────────────────────────

test("no base rule puts every heading in the display serif", () => {
  // The comp uses the serif for band titles only. Checked at 4x on its own
  // pixels: "Premium Tea", "Rajdhani Food Products at Tea Expo 2025",
  // "Carefully Plucked" and "QUICK LINKS" are all sans there, and every one
  // of them was rendering in Playfair here purely for being an h2 or an h3.
  //
  // Size is what decides it in the design and a base rule cannot see size,
  // so the serif is opt-in and the rest inherit the body sans.
  const css = readFileSync(join(SRC, "index.css"), "utf8");

  assert.doesNotMatch(css, /h1,\s*h2,\s*h3\s*\{[^}]*font-family/);
});

test("the band titles keep the serif and the card titles do not", () => {
  const serif = {
    "components/home/Hero.jsx": "the hero headline",
    "components/home/FeaturedProducts.jsx": "Our Premium Tea Range",
    "components/home/ProcessBand.jsx": "From Garden To Your Cup",
    "components/home/DealerCta.jsx": "the dealer bar",
    "components/content/SectionHeading.jsx": "every other band title",
  };
  for (const [path, what] of Object.entries(serif)) {
    assert.match(strip(read(path)), /font-display text-/, `${what} lost the serif`);
  }

  // A card title is not a band title. These are the four the comp shows as
  // sans, plus the wishlist row, which is the same product name in a
  // different place and would look like a different component in serif.
  const sans = [
    ["components/ProductCard.jsx", /<h3 className="text-xs font-semibold text-ink sm:text-base">/],
    ["components/home/LatestNews.jsx", /<h3 className="mt-2 text-base font-semibold leading-snug text-ink">/],
    ["components/news/NewsCard.jsx", /<h2 className="mt-2 text-lg font-semibold leading-snug text-ink">/],
    ["pages/WishlistPage.jsx", /<h2 className="text-base font-semibold text-ink">/],
  ];
  for (const [path, pattern] of sans) {
    const source = strip(read(path));
    assert.match(source, pattern, `${path}: a card title is sans in the comp`);
  }

  // And the small headings that were only ever serif by inheritance.
  assert.match(strip(read("components/home/ProcessBand.jsx")), /text-\[0\.6875rem\] font-semibold leading-tight text-ink/);
  assert.doesNotMatch(strip(read("components/layout/Footer.jsx")), /font-display text-sm/, "footer column headings");
});

test("the quotes band rests on the footer the way the comp draws it", () => {
  // 9px in the comp at 1280-equivalent, from the news cards' lower border to
  // the footer's top edge — 7px of a 1024-wide frame. It was a full section.
  const voices = strip(read("components/home/VoicesBand.jsx"));

  assert.match(voices, /pb-2 pt-\(--space-section\)/);
  assert.doesNotMatch(voices, /py-\(--space-section\)/);
});

test("the dealer bar is the comp's size, not half again as tall", () => {
  // Measured at 1280-equivalent off a 1024-wide comp: the bar is 95px tall,
  // padded 14px, with a 65px mark, a ~20px title, a 14px subtitle on a 20px
  // line and a 39px button. Ours was 148px — `py-8` around a title and a
  // subtitle each a size too large.
  //
  // The mark is the one part that was already right, and it is asserted here
  // so nobody "fixes" it to match the rest.
  assert.match(dealerCta, /grid size-16 shrink-0 place-items-center rounded-full bg-surface/, "the 64px mark stays");

  assert.match(dealerCta, /className="font-display text-xl font-bold text-on-brand"/);
  assert.doesNotMatch(dealerCta, /sm:text-2xl/, "no size step above the comp's heading");

  assert.match(dealerCta, /className="mt-1 max-w-xl text-sm text-on-brand\/85"/);
  assert.doesNotMatch(dealerCta, /leading-relaxed/, "26px lines are what made the block too tall");

  // Tightened only from lg, where the bar is the comp's row rather than a
  // three-item column.
  assert.match(dealerCta, /px-6 py-6 sm:px-8 lg:flex-row lg:items-center lg:gap-8 lg:py-3\.5 lg:pr-64/);

  // 44px, not the comp's 39px: WCAG 2.5.5 is the floor and the responsive
  // suite enforces it.
  assert.match(dealerCta, /inline-flex h-11 shrink-0 items-center/);
  assert.doesNotMatch(dealerCta, /h-12/);
});

test("the dealer bar carries the reference's leaves at its right end", () => {
  assert.match(dealerCta, /src="\/home-distibutor-right\.png"/);
  assert.match(dealerCta, /fade-in-from-left absolute inset-y-0 right-0 -z-10 hidden h-full w-\[20%\] object-cover lg:block/);
  assert.match(dealerCta, /relative isolate flex flex-col gap-6 overflow-hidden rounded-xl bg-brand/);
});

test("the leaves do not stretch across the whole bar", () => {
  // The bar is about 9.6:1 and the image 1.56:1. Full width would crop to a
  // 16% horizontal sliver and turn the leaves into mush; a third of the bar
  // keeps 45% of the image's height and puts them over its right fifth,
  // which is where the reference has them.
  const bar = { w: 1232, h: 128 };
  const img = { w: 1568, h: 1003 };

  const full = Math.max(bar.w / img.w, bar.h / img.h);
  assert.ok((bar.h / full) / img.h < 0.2, "full width really would be a sliver");

  const boxed = Math.max((bar.w * 0.2) / img.w, bar.h / img.h);
  // Narrower is better on both counts, which is the counterintuitive part:
  // below about 22% the scale is set by the box's width rather than its
  // height, so more of the leaf survives, not less.
  assert.ok((bar.h / boxed) / img.h > 0.75, "a fifth of the bar keeps most of the leaf");
  assert.ok((bar.w * 0.2 * 0.6) / bar.w < 0.15, "and they cover about an eighth of the bar");
});

test("the button is not pushed under the leaves", () => {
  // In the reference the CTA sits clear of them, with bar left over to its
  // right. Without the extra right padding the button lands on top.
  assert.match(dealerCta, /lg:pr-64/);
});

test("the leaves are decoration, and behind the content", () => {
  assert.match(dealerCta, /alt=""/);
  assert.match(dealerCta, /aria-hidden="true"/);
  assert.match(dealerCta, /-z-10/, "behind the heading, not over it");
  assert.match(dealerCta, /loading="lazy"/);
});

test("the bar's own colour stays underneath the image", () => {
  // The image's green and `--color-brand` are not the same green. The fade is
  // what means they never have to be — and `bg-brand` is still the real
  // background if the image is slow or fails.
  assert.match(dealerCta, /bg-brand/);
  assert.match(dealerCta, /fade-in-from-left/);
});
