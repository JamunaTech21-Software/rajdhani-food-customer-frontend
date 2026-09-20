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
  assert.match(processBand, /lg:grid-cols-5/);
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
  assert.match(featured, /auto-cols-\[minmax\(15rem,1fr\)\] grid-flow-col gap-5 overflow-x-auto/);
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

test("six across at xl, and the card width follows the row", () => {
  // The reference draws six. A fixed card width would have to be recomputed
  // by hand every time the arrows changed size, and be silently wrong in
  // between; a percentage of the strip follows it.
  assert.match(featured, /xl:auto-cols-\[calc\(\(100%-100px\)\/6\)\]/);
  assert.equal(SIZES.carouselCard, "(min-width: 1280px) 170px, 240px");
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

test("each dot is a 44px target that says which one it is", () => {
  // The button is the target; the 8px span is the dot the reference draws.
  assert.match(quotes, /className="group grid h-11 place-items-center px-1"/);
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
  assert.match(voices, /py-\(--space-section\)/);
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
  assert.match(strip(read("pages/AboutPage.jsx")), /<StatsBand stats=\{itemsOf\(stats\)\} label="Rajdhani in numbers" \/>/);
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
  assert.match(usp, /sm:grid-cols-2 sm:p-8 lg:grid-cols-4/);
});

test("the dealer bar sits the same distance from both neighbours", () => {
  // Every other band carries `py-(--space-section)`, so a bar with a bottom
  // padding of its own had one section of space above it and two below —
  // visibly off-centre between the process band and the quotes.
  const dealer = strip(read("components/home/DealerCta.jsx"));

  assert.doesNotMatch(dealer, /p[bty]-\(--space-section\)/);
  for (const neighbour of ["ProcessBand", "VoicesBand"]) {
    assert.match(strip(read(`components/home/${neighbour}.jsx`)), /py-\(--space-section\)/, neighbour);
  }
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

    assert.match(source, /py-\(--space-section\)/, `${name} has no vertical rhythm`);
  }
});

// ── H8: the hero, matched to the reference ───────────────────────────────

test("the headline is dark on a light hero, as the reference draws it", () => {
  // It was white over a 40% `bg-ink` scrim, with the highlight in gold.
  assert.match(hero, /font-bold leading-\[1\.1\] text-ink /);
  assert.match(hero, /<span className="block text-brand">\{banner\.title_highlight\}/);
  assert.match(hero, /text-ink-muted sm:text-lg/, "and the subtitle with it");
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
  assert.match(hero, /bg-gradient-to-r from-surface from-0% via-surface\/60 via-35% to-transparent to-68%/);
});

test("the admin's overlay slider still does something, but has a floor", () => {
  // It may add protection. It may not remove it — that is the one thing the
  // slider must not be able to do now the text is dark.
  assert.match(hero, /const MINIMUM_PROTECTION = 0\.8;/);
  assert.match(hero, /Math\.max\(MINIMUM_PROTECTION, Math\.min\(Math\.max\(overlayOpacity \?\? 40, 0\), 100\) \/ 100\)/);
});

test("the second CTA is the reference's white button, not a translucent one", () => {
  // The old one only read because the image behind it was darkened.
  assert.match(hero, /border border-line-strong bg-surface text-ink hover:border-brand/);
  assert.doesNotMatch(hero, /bg-surface\/10|backdrop-blur-sm/);
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
  // `PageHero` is a different component with its own dark overlay, used by
  // About, Quality, Contact and four more. The reference covers the home page
  // only, and nothing here should have reached them.
  const pageHero = strip(read("components/layout/PageHero.jsx"));

  assert.match(pageHero, /bg-ink/);
  assert.match(pageHero, /text-ink-inverse/);
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
  assert.match(processBand, /className="fade-in-from-left absolute bottom-0 right-0 top-\(--space-section\)/);

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
  assert.match(processBand, /<h3 className="mt-4 text-sm font-semibold text-ink">/);
  assert.match(processBand, /<p className="mt-1 text-xs leading-relaxed text-balance text-ink-muted">/);
});

test("the photograph's top edge lines up with the text beside it", () => {
  // It reads the same token as the section's own top padding, so the two stay
  // level as `--space-section` steps 48 -> 80 -> 112px across breakpoints. A
  // hardcoded offset matched it at exactly one width and drifted at the rest.
  const img = processBand.slice(processBand.indexOf("<img"), processBand.indexOf("/>", processBand.indexOf("<img")));

  assert.match(processBand, /py-\(--space-section\)/, "the section's padding");
  assert.match(img, /top-\(--space-section\)/, "and the photo's offset, from the same token");
  assert.doesNotMatch(img, /top-\d/, "no hardcoded offset on the photo to fall out of step");

  // It still bleeds to the band's lower edge.
  assert.match(img, /absolute bottom-0 right-0/);
});

test("the vertical half of object-position is not used, because it cannot work", () => {
  // The column is portrait (352x479 at xl) and the source is 1942x809, so
  // `cover` scales to the *height* and crops only the width. The whole height
  // of the photograph is already on screen, which makes `object-right bottom`
  // or `right 70%` completely inert — an easy no-op to ship by accident.
  const box = { w: (1280 - 1280) / 2 + 352, h: 112 * 2 + 255 };
  const scale = Math.max(box.w / 1942, box.h / 809);

  assert.ok(box.h / scale >= 809 - 1, "the full height is visible, so a vertical anchor does nothing");
  assert.match(processBand, /object-cover object-right lg:block/);
  assert.doesNotMatch(processBand, /object-\[right_\d/, "no inert two-value position");
});

// ── The dealer bar's leaves ──────────────────────────────────────────────

test("the dealer bar carries the reference's leaves at its right end", () => {
  assert.match(dealerCta, /src="\/home-distibutor-right\.png"/);
  assert.match(dealerCta, /fade-in-from-left absolute inset-y-0 right-0 -z-10 hidden w-\[20%\] object-cover lg:block/);
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
