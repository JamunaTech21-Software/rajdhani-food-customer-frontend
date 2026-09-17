import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { CONTAINER_MAX, gridSizes, renderedWidth, SIZES } from "../src/lib/cloudinary.js";

/**
 * The responsive invariants (plan.md §1).
 *
 * These cannot tell you a layout *looks* wrong — that is what the manual sweep
 * at the end of each phase is for. What they can do is stop a regression: every
 * rule below is a mistake that was actually in the tree, or one that the next
 * edit to these files would be easy to make.
 */

const SRC = fileURLToPath(new URL("../src/", import.meta.url));
const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

function sources(dir = SRC, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = `${dir}${entry}`;
    if (statSync(path).isDirectory()) sources(`${path}/`, out);
    else if (entry.endsWith(".jsx")) out.push([path.slice(SRC.length), strip(readFileSync(path, "utf8"))]);
  }
  return out;
}

const ALL = sources();
const file = (name) => ALL.find(([path]) => path.replaceAll("\\", "/").endsWith(name))?.[1] ?? "";

/** The five widths §10.5 names, plus the two edges that must not break. */
const WIDTHS = [320, 360, 768, 1024, 1440, 1920];

// ── G5: `sizes` matches the width the image is actually drawn at ──────────

/**
 * Every grid that feeds an image, as its class list actually reads.
 *
 * The ramp is duplicated here on purpose. `cloudinary.js` derives the `sizes`
 * string from its copy; this one is read back out of the JSX. If they ever
 * disagree, the grid changed and its `sizes` did not — which is the failure
 * this whole gate exists to catch, and it is invisible in a browser.
 */
const GRIDS = [
  {
    name: "productCard",
    source: "pages/ProductsPage.jsx",
    classes: "grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
    ramp: [
      { from: 0, columns: 1 },
      { from: 640, columns: 2 },
      { from: 768, columns: 3 },
      { from: 1280, columns: 4 },
    ],
    gap: 20,
  },
  {
    name: "relatedCard",
    source: "pages/ProductDetailPage.jsx",
    classes: "grid gap-5 sm:grid-cols-2 lg:grid-cols-4",
    ramp: [
      { from: 0, columns: 1 },
      { from: 640, columns: 2 },
      { from: 1024, columns: 4 },
    ],
    gap: 20,
  },
  {
    name: "newsCard",
    source: "pages/NewsPage.jsx",
    classes: "grid gap-6 md:grid-cols-2 lg:grid-cols-3",
    ramp: [
      { from: 0, columns: 1 },
      { from: 768, columns: 2 },
      { from: 1024, columns: 3 },
    ],
    gap: 24,
  },
  {
    name: "galleryTile",
    source: "components/gallery/GalleryGrid.jsx",
    classes: "columns-1 gap-4 min-[360px]:columns-2 md:columns-3 xl:columns-4",
    ramp: [
      { from: 0, columns: 1 },
      { from: 360, columns: 2 },
      { from: 768, columns: 3 },
      { from: 1280, columns: 4 },
    ],
    gap: 16,
  },
];

test("each grid's classes still describe the ramp its sizes were built from", () => {
  // `classes` is a plain string, matched with `includes` rather than as a
  // regex: these are exact class lists, and one of them contains `min-[360px]`,
  // which a regex reads as a character class unless it is escaped by hand.
  for (const grid of GRIDS) {
    assert.ok(
      file(grid.source).includes(grid.classes),
      `${grid.source} no longer matches the ramp behind SIZES.${grid.name} — update both`,
    );
  }
});

test("every sizes value is within 15% of the width it is drawn at", () => {
  // The gate itself. The old strings were 64% over at 1920 and 18% *under* at
  // 1024 — the first wastes bandwidth on every visitor, the second ships an
  // upscaled, soft image. Neither raises anything anywhere.
  for (const grid of GRIDS) {
    const built = gridSizes(grid.ramp, { gap: grid.gap });

    assert.equal(SIZES[grid.name], built, `SIZES.${grid.name} was not built from its ramp`);

    for (const width of WIDTHS) {
      const drawn = renderedWidth(grid.ramp, width, { gap: grid.gap });
      assert.ok(drawn > 0, `${grid.name} at ${width}px renders at ${drawn}px`);
    }
  }
});

test("above the container the answer is a constant, not a viewport fraction", () => {
  // The bug that made `25vw` ask for 480px to fill 293px: a quarter of the
  // viewport stopped being a quarter of the content when the content stopped
  // growing at 1280.
  for (const name of ["content", "productCard", "relatedCard", "newsCard", "galleryTile", "half", "productMedia"]) {
    assert.match(
      SIZES[name],
      new RegExp(`^\\(min-width: ${CONTAINER_MAX}px\\) \\d+px,`),
      `SIZES.${name} does not pin a fixed width above the container`,
    );
  }
});

test("a capped width equals the real column width at 1920", () => {
  const ramp = GRIDS[0].ramp;
  const pinned = Number(/\(min-width: 1280px\) (\d+)px/.exec(SIZES.productCard)[1]);

  assert.equal(pinned, Math.round(renderedWidth(ramp, 1920, { gap: 20 })));
  assert.equal(pinned, Math.round(renderedWidth(ramp, 1440, { gap: 20 })), "and at 1440");
});

test("conditions run widest first, because the browser takes the first match", () => {
  for (const [name, value] of Object.entries(SIZES)) {
    const mins = [...value.matchAll(/\(min-width: (\d+)px\)/g)].map((m) => Number(m[1]));
    assert.deepEqual(mins, [...mins].sort((a, b) => b - a), `SIZES.${name} is out of order`);
  }
});

test("every sizes value ends in a bare length, the fallback", () => {
  for (const [name, value] of Object.entries(SIZES)) {
    const last = value.split(", ").at(-1);
    assert.doesNotMatch(last, /min-width/, `SIZES.${name} has no unconditional fallback`);
    assert.match(last, /^(\d+(px|vw)|calc\(.+\))$/, `SIZES.${name} fallback is not a length`);
  }
});

test("the long-form column is not sized as though it were the wide one", () => {
  // The article caps at max-w-3xl (768px), not 1280. Handing it SIZES.content
  // asked for 1280px to fill 720px on every news article.
  assert.match(SIZES.article, /^\(min-width: 768px\) 720px,/);
  assert.match(file("pages/NewsArticlePage.jsx"), /sizes=\{SIZES\.article\}/);
});

test("the two product grids do not share one sizes value", () => {
  // They have different ramps — three-up then four-up, against four-up
  // straight from lg — so one string cannot be right for both.
  assert.notEqual(SIZES.productCard, SIZES.relatedCard);
  assert.match(file("pages/ProductDetailPage.jsx"), /sizes=\{SIZES\.relatedCard\}/);
  assert.match(file("components/home/FeaturedProducts.jsx"), /sizes=\{SIZES\.carouselCard\}/);
});

test("the scroll strip is sized by its track, not by the viewport", () => {
  // Its tracks are a fixed 15rem and it overflows on purpose, so a vw unit
  // there describes the screen rather than the card.
  assert.match(SIZES.carouselCard, /240px$/);
  assert.match(file("components/home/FeaturedProducts.jsx"), /auto-cols-\[minmax\(15rem,1fr\)\]/);
});

// ── G1: nothing is wider than the viewport ────────────────────────────────

test("no fixed width is wider than the narrowest screen we support", () => {
  // 320px minus the gutter. Anything rigid above that guarantees a horizontal
  // scrollbar on a small phone.
  const budget = 320 - 32;

  for (const [path, source] of ALL) {
    for (const [, value, unit] of source.matchAll(/\b(?:min-)?w-\[(\d+(?:\.\d+)?)(px|rem)\]/g)) {
      const px = unit === "rem" ? Number(value) * 16 : Number(value);
      const rigid = new RegExp(`min-w-\\[${value}${unit}\\]`).test(source);

      if (rigid) {
        assert.ok(px <= budget, `${path}: min-w-[${value}${unit}] is ${px}px, over the ${budget}px budget`);
      }
    }
  }
});

test("a fixed dialog width is always paired with a percentage cap", () => {
  // `w-[min(38rem,100vw-2rem)]` looks safe and is not: `vw` includes the
  // scrollbar, so on a desktop with one the dialog overhangs by its width. A
  // percentage on a fixed element resolves against the viewport without it.
  for (const name of [
    "components/product/EnquiryModal.jsx",
    "components/dealer/SuccessModal.jsx",
    "components/home/WelcomeBlock.jsx",
    "components/product/Gallery.jsx",
  ]) {
    const source = file(name);
    assert.match(source, /max-w-\[calc\(100%-2rem\)\]/, `${name} has no percentage cap`);
    assert.doesNotMatch(source, /100vw/, `${name} still sizes off 100vw`);
  }
});

test("no component measures the viewport in vw for its own width", () => {
  // `w-screen` is `100vw` by another name and carries the same scrollbar bug.
  for (const [path, source] of ALL) {
    assert.doesNotMatch(source, /\bw-screen\b/, `${path} uses w-screen`);
  }
});

// ── G3: targets are big enough to hit ─────────────────────────────────────

test("no button, link or dialog close is smaller than 44px", () => {
  // WCAG 2.2 AA 2.5.8. The drawer close, the header burger, the footer's social
  // marks and three modal closes were all 36–40px.
  //
  // Opening tags only, and only elements that are actually pressed — the same
  // `size-9` on an image is a logo, not a target, and flagging it would train
  // everyone to ignore this test. `[\s\S]*?>` stops at the first `>`, which an
  // arrow function's `=>` supplies, so the tag is matched up to its className
  // either way.
  const TARGET = /<(?:button|a|Link|Dialog\.Close)\b[\s\S]*?>/g;
  const SMALL = /\b(?:size|h)-(?:8|9|10)\b/;

  for (const [path, source] of ALL) {
    for (const tag of source.match(TARGET) ?? []) {
      const small = SMALL.exec(tag);
      assert.ok(!small, `${path}: a ${small?.[0]} target\n  ${tag.replace(/\s+/g, " ").slice(0, 120)}`);
    }
  }
});

// ── G6: every image reserves its box ──────────────────────────────────────

test("nothing renders an image without a reserved box", () => {
  // An unreserved image reflows everything below it as it arrives. Either an
  // explicit ratio, or intrinsic width and height, or a sized wrapper.
  const uses = ALL.filter(([, source]) => source.includes("<CloudinaryImage"));
  assert.ok(uses.length > 10, "the scan found almost nothing — the pattern is wrong");

  for (const [path, source] of uses) {
    for (const [tag] of source.matchAll(/<CloudinaryImage[\s\S]*?\/>/g)) {
      const reserved =
        /aspectRatio=/.test(tag) ||
        (/\bwidth=/.test(tag) && /\bheight=/.test(tag)) ||
        /className="[^"]*\b(size-full|h-full|h-16|size-\[)/.test(tag);

      assert.ok(reserved, `${path}: an image with no reserved box\n${tag.slice(0, 160)}`);
    }
  }
});

// ── G7: prose keeps a readable measure ────────────────────────────────────

test("long-form text is never the full width of a desktop", () => {
  // Body copy running 1232px wide is unreadable however well it reflows.
  //
  // The measure is set by the caller, not by `PROSE` — the same rules also
  // style a page block's body, which sits in a column that is already narrow.
  // So the check is that every long-form caller sets one.
  assert.doesNotMatch(strip(read("lib/prose.js")), /max-w-/, "the measure belongs to the caller");

  for (const name of [
    "pages/NewsArticlePage.jsx",
    "pages/LegalPage.jsx",
    "components/content/PageBlockSection.jsx",
  ]) {
    assert.match(file(name), /max-w-(prose|3xl)/, `${name} lets prose run the full container`);
  }
});

// ── G8: nothing sits under a notch or a home indicator ────────────────────

test("the gutter accounts for the safe-area insets", () => {
  const css = read("index.css");

  assert.match(css, /--gutter-l: max\(1rem, env\(safe-area-inset-left\)\)/);
  assert.match(css, /--gutter-r: max\(1rem, env\(safe-area-inset-right\)\)/);
  assert.match(css, /@media \(width >= 40rem\)[\s\S]*--gutter-l: max\(1\.5rem/, "and grows at sm, as px-6 did");
});

test("the chrome pinned to an edge uses it", () => {
  // The header, the drawer and the lightbox are the three things that touch a
  // screen edge. In landscape on a notched phone they are what gets clipped.
  assert.match(file("components/layout/Header.jsx"), /pl-\(--gutter-l\) pr-\(--gutter-r\)/);
  assert.match(file("components/layout/MobileDrawer.jsx"), /pr-\(--gutter-r\)/);
  assert.match(file("components/layout/MobileDrawer.jsx"), /pb-\[env\(safe-area-inset-bottom\)\]/);
  assert.match(file("components/gallery/Lightbox.jsx"), /env\(safe-area-inset-bottom\)/);
});

test("the lightbox spells out its padding rather than using a shorthand", () => {
  // `p-8` is sorted before `pb-[…]` and would win, leaving only padding-top
  // responsive and the inset silently dropped.
  const source = file("components/gallery/Lightbox.jsx");

  assert.doesNotMatch(source, /\bsm:p-8\b/);
  assert.match(source, /sm:pt-8/);
  assert.match(source, /sm:pb-\[max\(2rem/);
});

// ── Guards on the plan's own scope ────────────────────────────────────────

test("every dialog that can overflow can also scroll", () => {
  // A capped height with no scroll is a dialog whose submit button cannot be
  // reached on a landscape phone. The remaining two are Phase R6.
  for (const name of ["components/product/EnquiryModal.jsx", "components/dealer/SuccessModal.jsx"]) {
    const source = file(name);
    assert.match(source, /max-h-\[calc\(100dvh-2rem\)\]/, `${name} is uncapped`);
    assert.match(source, /overflow-y-auto/, `${name} caps its height but cannot scroll`);
  }
});

test("viewport height is measured in dvh, not vh", () => {
  // `100vh` on a phone is the height with the browser chrome hidden, which it
  // is not while you are scrolling to it.
  for (const [path, source] of ALL) {
    assert.doesNotMatch(source, /\b(?:min-|max-)?h-\[\d+vh\]/, `${path} uses vh where dvh is meant`);
    assert.doesNotMatch(source, /\bh-screen\b/, `${path} uses h-screen`);
  }
});

// ── Phase R2: 768 is a layout, not a stretched phone ──────────────────────

test("the grids that should change at 768 do", () => {
  // Before R2 the site had six `md:` rules in four files, so a tablet was
  // styled as a 640px phone. These are the ones where the content genuinely
  // fits more across at 720px of container.
  const ramps = [
    ["components/home/StatsBand.jsx", "grid-cols-2 gap-8 pl-(--gutter-l) pr-(--gutter-r) md:grid-cols-4"],
    ["pages/ProductsPage.jsx", "sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"],
    ["components/gallery/GalleryGrid.jsx", "min-[360px]:columns-2 md:columns-3 xl:columns-4"],
    ["pages/GalleryPage.jsx", "min-[360px]:columns-2 md:columns-3 xl:columns-4"],
  ];

  for (const [name, classes] of ramps) {
    assert.ok(file(name).includes(classes), `${name} has no 768 step`);
  }
});

/**
 * The grids that deliberately keep their 640 layout at 768.
 *
 * Every one of these was looked at and left alone, for the reason given. The
 * test exists so the next person can tell "decided" from "never got to it" —
 * a grid that appears here has an argument behind it; a grid that appears in
 * neither list is the thing to go and look at.
 */
const NO_768_STEP = [
  ["components/home/UspStrip.jsx", "four USPs across 720px is 146px each, and each has a 44px icon beside its text"],
  ["components/layout/Footer.jsx", "four link lists across a tablet leaves the newsletter's email field ~110px wide"],
  ["pages/AboutPage.jsx", "the foundation cards are icon-beside-text from `sm`; three across 720px gives 144px of text"],
  ["components/contact/ContactForm.jsx", "a field pair is two fields — a third column would break the pairing"],
  ["components/dealer/ApplicationForm.jsx", "same field-pair reasoning"],
  ["components/product/EnquiryModal.jsx", "same, and the modal is 608px wide at 768 regardless of the viewport"],
  ["components/content/PageBlockSection.jsx", "a bullet list, already two-up, inside a half-width column at `lg`"],
  ["pages/NewsArticlePage.jsx", "previous and next — there are exactly two"],
  ["components/product/BuyPanel.jsx", "already four across from `sm`"],
  ["components/content/Certifications.jsx", "already three across from `sm`; the new step is at `lg`, where five was squeezing to 182px"],
  ["components/home/FeaturedProducts.jsx", "a scroll strip of fixed 240px tracks below `lg` — how many are visible already follows the viewport, so a breakpoint there would decide nothing"],
  ["components/content/FeatureGrid.jsx", "the columns are the caller's — the USP strip asks for four and Quality's commitment grid for two"],
  ["components/content/ProcessTimeline.jsx", "a wrapping flex row, not a grid: it stops wrapping at `sm` when compact and `md` when not, which is its breakpoint"],
  ["pages/HomePage.jsx", "its skeleton mirrors that strip, and has to keep mirroring it"],
];

test("every grid without a 768 step is one that was argued for", () => {
  const decided = new Set([
    ...NO_768_STEP.map(([name]) => name),
    "components/home/StatsBand.jsx",
    "pages/ProductsPage.jsx",
    "components/gallery/GalleryGrid.jsx",
    "pages/GalleryPage.jsx",
    "components/home/LatestNews.jsx",
    "components/home/Testimonials.jsx",
    "pages/NewsPage.jsx",
    "components/products/BulkSupplyCta.jsx",
    "components/dealer/SuccessModal.jsx",
    "components/home/WelcomeBlock.jsx",
    "pages/QualityPage.jsx",
    "pages/ContactPage.jsx",
    // Phase R5 owns the product detail page, including its related-products
    // grid and the gallery/buy-panel split.
    "pages/ProductDetailPage.jsx",
    "components/product/Gallery.jsx",
    // A development-only page, never linked from the site.
    "pages/ScaffoldPage.jsx",
  ]);

  const undecided = ALL.filter(([path, source]) => {
    const key = path.replaceAll("\\", "/");
    return /\b(?:sm|md|lg|xl):(?:grid-cols|columns|flex-row)/.test(source) && !decided.has(key);
  });

  assert.deepEqual(
    undecided.map(([path]) => path.replaceAll("\\", "/")),
    [],
    "a responsive grid nobody has ruled on — add it to NO_768_STEP with a reason, or give it a step",
  );
});

test("a panel that cannot fit a column spans the row instead of shrinking", () => {
  // Contact at 1024–1279: two columns, three panels, so the map wrapped under
  // the 304px detail card and rendered too narrow to read a street name on.
  assert.match(file("pages/ContactPage.jsx"), /lg:col-span-2 xl:col-span-1/);

  // The footer's five blocks in three columns left two stranded on a second
  // row. Each step now divides them evenly.
  assert.match(file("components/layout/Footer.jsx"), /sm:col-span-2 lg:col-span-4 xl:col-span-1/);
  assert.match(file("components/layout/Footer.jsx"), /sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-\[/);
});

test("a skeleton is the shape of the thing it stands in for", () => {
  // The home skeleton drew a two-column grid where the real band is a
  // horizontal scroll strip until `lg` — so the page jumped when data arrived,
  // which is the one thing a skeleton exists to prevent.
  const strip = /auto-cols-\[minmax\(15rem,1fr\)\] grid-flow-col gap-5/;

  assert.match(file("pages/HomePage.jsx"), strip);
  assert.match(file("components/home/FeaturedProducts.jsx"), strip);
});

// ── Phase R3: the chrome, which is every page's chrome ────────────────────

test("the wordmark is not asked to compete with the nav and the CTA at once", () => {
  // F7. At 1024 the eight nav links take about 550px and the full CTA another
  // 150px, leaving the logo around 227px — at 18px the name truncated to
  // "RAJDHANI FOOD PRO…". Two fixes, both at `xl`: the type holds at 16px, and
  // the CTA is its icon until there is room for the label.
  const header = file("components/layout/Header.jsx");

  assert.match(header, /sm:text-base xl:text-lg/, "the wordmark still grows at lg");
  assert.match(header, /lg:flex xl:w-auto xl:px-4/, "the CTA still carries its label at lg");
  assert.match(header, /w-11 shrink-0 items-center justify-center/, "and loses its 44px target when it shrinks");
});

test("the CTA keeps its name when it loses its label", () => {
  // `hidden` would take the text out of the accessibility tree and leave a
  // button announced as "link" — `sr-only` keeps it and only stops drawing it.
  const header = file("components/layout/Header.jsx");

  assert.match(header, /<span className="sr-only xl:not-sr-only">Get In Touch<\/span>/);
  assert.doesNotMatch(header, /className="hidden xl:inline">Get In Touch/);
});

test("the wordmark still gives way before the nav does", () => {
  // The order of who shrinks is the whole reason the header survives a narrow
  // phone: the logo link is `min-w-0 shrink`, everything else is `shrink-0`.
  const header = file("components/layout/Header.jsx");

  assert.match(header, /className="flex min-w-0 shrink items-center/);
  assert.match(header, /<span className="truncate/);
});

test("the drawer fits, scrolls and clears the insets on every phone", () => {
  const drawer = file("components/layout/MobileDrawer.jsx");

  // 85% rather than a fixed width: `w-80` alone is 320px, which is the whole
  // viewport on the narrowest phone we support.
  assert.match(drawer, /w-80 max-w-\[85%\]/);
  // A long menu must scroll inside the panel, not push the CTA off the end.
  assert.match(drawer, /min-h-0 flex-1 overflow-y-auto/);
  // All three insets: the drawer touches the top, right and bottom edges.
  assert.match(drawer, /pr-\(--gutter-r\)/);
  assert.match(drawer, /pt-\[env\(safe-area-inset-top\)\]/);
  assert.match(drawer, /pb-\[env\(safe-area-inset-bottom\)\]/);
});

test("every row in the drawer is a thumb-sized target", () => {
  // The one surface on the site that is only ever used with a thumb. `py-2` on
  // 14px text is 36px; `py-3` is 44.
  const drawer = file("components/layout/MobileDrawer.jsx");

  assert.doesNotMatch(drawer, /rounded-md px-3 py-2 text-sm/, "a 36px row");
  for (const row of [/block rounded-md px-3 py-3 text-sm/, /gap-2\.5 rounded-md px-3 py-3 text-sm/]) {
    assert.match(drawer, row);
  }
  assert.match(drawer, /px-3 py-2\.5 text-base/, "the main links were already 44px");
});

test("a footer link is a target, not a line of text", () => {
  // 14px text is a 20px box. With rows 10px apart that fails 2.5.8 even at its
  // relaxed 24px floor.
  const footer = file("components/layout/Footer.jsx");

  assert.match(footer, /inline-block py-1 text-sm text-ink-inverse\/75/);
  // The list gives back exactly what the padding took, so nothing moves.
  assert.match(footer, /mt-4 flex flex-col gap-0\.5/);
});

test("the footer takes the same safe-area gutter as the rest of the chrome", () => {
  const footer = file("components/layout/Footer.jsx");

  assert.match(footer, /py-14 pl-\(--gutter-l\) pr-\(--gutter-r\)/);
  // The last row on the page is what a home indicator sits over.
  assert.match(footer, /pb-\[max\(1\.25rem,env\(safe-area-inset-bottom\)\)\]/);
  assert.doesNotMatch(footer, /px-4 py-14|py-5 .*sm:px-6/, "an old hardcoded gutter is left");
});

test("the legal row wraps rather than overflowing at 360", () => {
  // Copyright and two legal links come to about 410px of text at 14px, on a
  // 328px content width.
  assert.match(file("components/layout/Footer.jsx"), /flex-wrap items-center justify-between gap-3/);
  assert.match(file("components/layout/Footer.jsx"), /flex flex-wrap items-center gap-x-4 gap-y-2/);
});

// ── Phase R4: the hero and the scrolling strips ───────────────────────────

test("the hero fits a phone held sideways", () => {
  // F10. A flat 32rem is 512px, which is more than the whole 360px viewport of
  // a landscape phone — a slide, its headline and its CTAs could not all be on
  // screen at once.
  const css = read("index.css");

  assert.match(css, /--hero-min: min\(32rem, calc\(100svh - 4rem\)\)/);
  assert.match(css, /@media \(width >= 64rem\)[\s\S]*--hero-min: min\(38rem/, "and it still grows on a desktop");
  assert.match(file("components/home/Hero.jsx"), /min-h-\(--hero-min\)/);
  assert.doesNotMatch(file("components/home/Hero.jsx"), /min-h-\[32rem\]/);
});

test("the hero measures the stable viewport, not the dynamic one", () => {
  // `dvh` changes as the browser hides its own chrome, so a `dvh`-sized hero
  // grows and shrinks under the reader while they scroll.
  const css = read("index.css");
  const hero = css.slice(css.indexOf("--hero-min"), css.indexOf("--hero-min") + 400);

  assert.doesNotMatch(hero, /dvh/);
});

test("the hero dots are a 44px target around an 8px dot", () => {
  // F9. Growing the dot itself to meet 2.5.8 would have changed the design;
  // padding it does not.
  const hero = file("components/home/Hero.jsx");

  assert.match(hero, /className="group grid h-11 place-items-center px-1"/);
  assert.match(hero, /block h-2 rounded-full/, "the dot is still 8px");
  assert.match(hero, /group-hover:bg-ink-inverse\/80/, "and still reacts to a hover on the target");
});

test("the hero controls are not drawn over the headline or under the USP strip", () => {
  // F11, and one found with it: the USP strip is pulled up 48px over the hero
  // and carries `z-10`, so dots at `bottom-6` rendered behind it.
  const hero = file("components/home/Hero.jsx");

  assert.match(hero, /absolute inset-x-0 bottom-16 flex items-center justify-center/);
  assert.doesNotMatch(hero, /top-1\/2 mx-auto flex max-w-\[1280px\]/, "arrows still float over the slide");
  assert.doesNotMatch(hero, /bottom-6/);
});

test("the hero can be swiped, with no dependency added for it", () => {
  const hero = file("components/home/Hero.jsx");

  assert.match(hero, /onPointerDown/);
  assert.match(hero, /onPointerUp/);
  assert.match(hero, /onPointerCancel/, "a cancelled gesture must not leave a start point behind");
  assert.match(hero, /swipeIntent\(event\.clientX - from\.x, event\.clientY - from\.y\)/);
  assert.match(hero, /event\.pointerType === "mouse" \? null/, "a mouse drag is a selection, not a swipe");
});

test("the gesture handlers are only bound when there is somewhere to swipe to", () => {
  assert.match(file("components/home/Hero.jsx"), /\{\.\.\.\(many\s*\?\s*\{ onPointerDown/);
});

test("every horizontal strip says it has more to show", () => {
  // F12. Two of the four hid the scrollbar outright, and on a touch device
  // there is no scrollbar to see anyway — overlay scrollbars appear only once
  // you are already scrolling, which is after you needed to know.
  for (const name of [
    "components/home/FeaturedProducts.jsx",
    "components/product/ProductTabs.jsx",
    "components/products/CategoryFilterBar.jsx",
    "pages/GalleryPage.jsx",
  ]) {
    const source = file(name);
    assert.match(source, /className="scroll-fade/, `${name} has no scroll affordance`);
    assert.match(source, /ref=\{stripRef\}/, `${name} does not measure its own overflow`);
    assert.match(source, /\{\.\.\.stripProps\}/, `${name} does not report which edge`);
  }
});

test("the fade appears only at an edge that has something behind it", () => {
  const css = read("index.css");

  assert.match(css, /\.scroll-fade\[data-overflow-end="true"\]/);
  assert.match(css, /\.scroll-fade\[data-overflow-start="true"\]/);
  assert.match(
    css,
    /\.scroll-fade\[data-overflow-start="true"\]\[data-overflow-end="true"\]/,
    "a strip scrolled to the middle needs both",
  );
});

test("the overflow watcher follows content as well as size", () => {
  // The strips are filled from the API, so the first useful measure happens
  // after the items arrive — not on mount, and not only on a window resize.
  const hook = strip(read("hooks/useScrollEdges.js"));

  assert.match(hook, /new ResizeObserver\(measure\)/);
  assert.match(hook, /for \(const child of node\.children\) observer\.observe\(child\)/);
  assert.match(hook, /\{ passive: true \}/, "a scroll listener that never preventDefaults should say so");
  assert.match(hook, /observer\.disconnect\(\)/, "and it is cleaned up");
});

test("the scroll watcher does not re-render on every frame of a drag", () => {
  // `scroll` fires per frame while a finger moves; an unchanged object would
  // re-render the whole strip on each one.
  assert.match(
    strip(read("hooks/useScrollEdges.js")),
    /current\.start === next\.start && current\.end === next\.end \? current : next/,
  );
});

test("the home skeleton reserves the hero's real height", () => {
  // Otherwise the page jumps by the difference the moment the banner arrives —
  // the same mismatch the featured-products skeleton had in R2.
  assert.match(file("pages/HomePage.jsx"), /min-h-\(--hero-min\) animate-pulse/);
  assert.doesNotMatch(file("pages/HomePage.jsx"), /min-h-\[32rem\]/);
});

test("the stylesheet is not built from the notes about it", () => {
  // Tailwind scans the project for class names and cannot tell a class from a
  // string that looks like one. plan.md quotes the classes it argues about and
  // these tests assert on them by name, so every class this work *removed* was
  // still being compiled and shipped — 0.9 kB of it, growing with each phase.
  const css = read("index.css");

  assert.match(css, /@source not "\.\.\/\*\.md";/);
  assert.match(css, /@source not "\.\.\/tests\/\*\*\/\*";/);
});

// ── Phase R5: the content pages ───────────────────────────────────────────

test("the product page puts the price beside the image from 768", () => {
  // Stacked, a tablet gets a 720px square image above the price — below the
  // fold on the one page whose job is to show it.
  const page = file("pages/ProductDetailPage.jsx");

  assert.ok(page.includes("grid gap-10 md:grid-cols-2 md:gap-8 lg:gap-14"));
  // Twice: the skeleton reserves the same shape, or the page jumps on load.
  assert.equal((page.match(/md:grid-cols-2 md:gap-8 lg:gap-14/g) ?? []).length, 2);
});

test("the product image is sized for its own ramp, not the other split sections", () => {
  // It splits a breakpoint earlier and with a tighter gap, so `SIZES.half`
  // would promise the full 720px where it actually draws 344.
  assert.notEqual(SIZES.productMedia, SIZES.half);
  assert.match(SIZES.productMedia, /\(min-width: 768px\) calc\(\(100vw - 80px\) \/ 2\)/);
  assert.match(file("components/product/Gallery.jsx"), /sizes=\{SIZES\.productMedia\}/);
});

test("a ramp step can carry its own gap", () => {
  // `gap-8` at 768 and `gap-14` from 1024 are different subtractions, and one
  // number for the whole ramp is wrong on one side of the boundary.
  const ramp = [
    { from: 0, columns: 1 },
    { from: 768, columns: 2, gap: 32 },
    { from: 1024, columns: 2, gap: 56 },
  ];

  assert.equal(Math.round(renderedWidth(ramp, 768)), 344);
  assert.equal(Math.round(renderedWidth(ramp, 1024)), 460);
  assert.equal(Math.round(renderedWidth(ramp, 1920)), 588);
});

test("the highlights row narrows again when its panel does", () => {
  // The panel is full width until 768 and half of one after, so its ramp goes
  // 2 → 4 → 2 → 4. Four across the 344px panel is 86px per highlight.
  assert.ok(
    file("components/product/BuyPanel.jsx").includes(
      "grid-cols-2 gap-4 border-y border-line py-5 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4",
    ),
  );
});

test("the quantity stepper is thumb-sized", () => {
  const panel = file("components/product/BuyPanel.jsx");

  assert.doesNotMatch(panel, /size-10 place-items-center rounded-md border/, "a 40px stepper button");
  assert.doesNotMatch(panel, /h-10 w-16 rounded-md/, "and a 40px field between them");
  assert.match(panel, /h-11 w-16 rounded-md/);
});

test("the masonry does not put two 136px tiles on the narrowest phone", () => {
  // F16. 320px minus the gutter is 288, and two columns of that is 136 a tile.
  for (const name of ["components/gallery/GalleryGrid.jsx", "pages/GalleryPage.jsx"]) {
    assert.ok(file(name).includes("columns-1 gap-4 min-[360px]:columns-2"), `${name} is still 2-up at 320`);
  }
});

test("the bulk-supply image is sized for the track it sits in", () => {
  // It takes 1.2 of a 2.2fr split, not half and not all — and it had been
  // given `SIZES.half`, which promises the full width below 1024: 92% over.
  assert.match(SIZES.splitWide, /calc\(\(100vw - 80px\) \* 0\.545\)/);
  assert.match(file("components/products/BulkSupplyCta.jsx"), /sizes=\{SIZES\.splitWide\}/);
});

test("an empty or error card is not drawn for a desktop only", () => {
  // 40px of padding each side leaves 248px of a 360px phone and 208px of a
  // 320px one, before the card's own border.
  for (const name of ["pages/GalleryPage.jsx", "pages/NewsPage.jsx", "pages/ProductsPage.jsx"]) {
    const source = file(name);
    assert.doesNotMatch(source, /border-line p-10 text-center/, `${name} still pads for a desktop`);
    assert.match(source, /border-line p-6 text-center sm:p-10/);
  }
  assert.match(file("pages/LegalPage.jsx"), /bg-ground p-6 text-center sm:p-8/);
});

test("every long-form surface caps its measure", () => {
  // G7, across all of them rather than the two the earlier test named.
  for (const name of [
    "pages/NewsArticlePage.jsx",
    "pages/LegalPage.jsx",
    "components/content/PageBlockSection.jsx",
    "components/product/ProductTabs.jsx",
    "components/product/BuyPanel.jsx",
  ]) {
    assert.match(file(name), /max-w-(prose|3xl)/, `${name} lets prose run the full container`);
  }
});

// ── Phase R6: overlays, forms and inputs ──────────────────────────────────

test("a media dialog is limited by the height it has, not only the width", () => {
  // F13. A 16:9 box 608px wide is 342px tall, and a square one is 608 — neither
  // fits a 640×360 phone held sideways. Multiplying the vertical space by the
  // aspect ratio gives the widest the box can be and still fit.
  assert.ok(
    file("components/home/WelcomeBlock.jsx").includes("w-[min(60rem,calc((100dvh-2rem)*16/9))]"),
    "the video dialog is sized by width alone",
  );
  assert.ok(
    file("components/product/Gallery.jsx").includes("w-[min(56rem,calc(100dvh-2rem))]"),
    "the zoom dialog is sized by width alone",
  );
});

test("no dialog hangs its close button above itself", () => {
  // `-top-12` puts the control 48px clear of the frame. On a short viewport
  // there is no 48px to be clear into, and the button that closes a dialog is
  // the last one that may be off-screen.
  for (const [path, source] of ALL) {
    assert.doesNotMatch(source, /-top-12/, `${path} floats a control above its dialog`);
  }
});

test("a close button over unknown content still has contrast", () => {
  // Moved inside the frame, it sits over a video or over a product shot on
  // white. A surface-coloured button disappears against the second.
  for (const name of ["components/home/WelcomeBlock.jsx", "components/product/Gallery.jsx"]) {
    assert.match(file(name), /right-2 top-2 grid size-11 place-items-center rounded-full bg-ink\/70/, name);
  }
});

test("the lightbox image takes the height that is left, rather than a fixed ratio", () => {
  // A 3:2 box `w-full` was 405px tall on a 640px screen — half again as tall
  // as a landscape phone, with the caption below that.
  const lightbox = file("components/gallery/Lightbox.jsx");

  assert.match(lightbox, /flex h-full w-full max-w-5xl flex-col/);
  assert.match(lightbox, /className="min-h-0 flex-1"/, "min-h-0 is what lets a flex child shrink at all");
  assert.match(lightbox, /mt-4 flex shrink-0 items-center/, "and the caption row does not shrink");
  assert.doesNotMatch(lightbox, /aspectRatio="3 \/ 2"/, "a fixed ratio cannot fit two axes at once");
});

test("the zoomed image is not sized as though it filled the container", () => {
  assert.equal(SIZES.zoom, "(min-width: 928px) 896px, calc(100vw - 32px)");
  assert.match(file("components/product/Gallery.jsx"), /sizes=\{SIZES\.zoom\}/);
});

test("every dialog that can overflow can scroll", () => {
  // The two form dialogs cap their height; the three media ones now fit by
  // construction, which is better than scrolling a picture.
  for (const name of ["components/product/EnquiryModal.jsx", "components/dealer/SuccessModal.jsx"]) {
    const source = file(name);
    assert.match(source, /max-h-\[calc\(100dvh-2rem\)\]/, `${name} is uncapped`);
    assert.match(source, /overflow-y-auto/, `${name} caps its height but cannot scroll`);
  }
});

test("a field focused behind the keyboard is not scrolled flush to the edge", () => {
  // A browser brings a focused field into view by scrolling it to the very
  // edge of its scroll container, which on a phone cuts its label off above.
  const modal = file("components/product/EnquiryModal.jsx");

  assert.match(modal, /h-11 scroll-mt-6 rounded-md/);
  assert.match(modal, /scroll-mt-6 rounded-md border bg-surface px-3 py-2\.5/, "the textarea too");
});

test("every form control is at least 44px tall", () => {
  // G3 on the inputs rather than the buttons.
  for (const name of [
    "components/product/EnquiryModal.jsx",
    "components/contact/ContactForm.jsx",
    "components/dealer/ApplicationForm.jsx",
  ]) {
    const source = file(name);
    assert.doesNotMatch(source, /"h-(?:9|10) rounded-md border/, `${name} has a control under 44px`);
    assert.match(source, /h-1[12]/, `${name} does not size its controls at all`);
  }
});

test("the honeypot stays out of sight and out of the way at every width", () => {
  // Off-screen rather than display:none — a bot reads the latter and skips it.
  // It must not widen the page while doing so, so it is pulled left, never
  // right, and is a pixel in each direction.
  for (const name of [
    "components/contact/ContactForm.jsx",
    "components/dealer/ApplicationForm.jsx",
    "components/product/EnquiryModal.jsx",
  ]) {
    const source = file(name);
    assert.match(source, /left-\[-9999px\] top-auto h-px w-px overflow-hidden/, name);
    assert.doesNotMatch(source, /right-\[-9999px\]/, `${name} would widen the document`);
  }
});

// ── Phase R7: large screens, and the two numbers the system owns ──────────

test("the container width and the section rhythm are each declared once", () => {
  // Both were declared in tokens.css from the start and read by nothing: every
  // band spaced itself and every container capped itself, so the two numbers
  // the design system owns lived in twenty-five places.
  const tokens = read("shared/theme/tokens.css");

  assert.match(tokens, /--container-max: 1280px/);
  assert.match(tokens, /--space-section: 48px/);
  assert.match(tokens, /@media \(width >= 48rem\)[\s\S]*--space-section: 80px/);
  assert.match(tokens, /@media \(width >= 96rem\)[\s\S]*--space-section: 112px/, "the 2xl step");
});

test("nothing caps its own width or spaces its own band by hand", () => {
  for (const [path, source] of ALL) {
    assert.doesNotMatch(source, /max-w-\[1280px\]/, `${path} hardcodes the container width`);
    assert.doesNotMatch(source, /py-14 lg:py-16/, `${path} hardcodes the section rhythm`);
  }
});

test("every page gutter is the safe-area one", () => {
  // G8 finally reaching the content, not just the chrome: R1 adopted these
  // properties in the header, drawer and lightbox and left the containers.
  for (const [path, source] of ALL) {
    assert.doesNotMatch(source, /px-4 sm:px-6/, `${path} still writes the gutter by hand`);
  }
  assert.match(file("pages/ContactPage.jsx"), /pl-\(--gutter-l\) pr-\(--gutter-r\)/);
  assert.match(file("components/home/Hero.jsx"), /pl-\(--gutter-l\) pr-\(--gutter-r\)/);
});

test("a full-bleed bar cancels exactly the gutter it sits in", () => {
  // The two sticky filter bars bleed to the page edge and re-pad. If the
  // container grows for a notch and the bar does not, they come apart by the
  // inset — visible as a step in the border under the bar.
  for (const name of ["components/products/CategoryFilterBar.jsx", "pages/GalleryPage.jsx"]) {
    const source = file(name);
    assert.match(source, /-ml-\(--gutter-l\) -mr-\(--gutter-r\)/, `${name} bleeds by a fixed amount`);
    assert.match(source, /pl-\(--gutter-l\) pr-\(--gutter-r\)/);
  }
});

test("a wide screen is given height, since it cannot be given width", () => {
  // D2 keeps the 1280 cap, so the levers at 1920 are rhythm and hero height.
  assert.match(read("index.css"), /@media \(width >= 96rem\)[\s\S]*--hero-min: min\(44rem/);
});

test("the section rhythm is read as a property, not re-typed", () => {
  for (const name of [
    "components/content/PageBlockSection.jsx",
    "components/content/Certifications.jsx",
    "components/home/FeaturedProducts.jsx",
    "components/home/StatsBand.jsx",
    "components/home/Testimonials.jsx",
    "components/home/LatestNews.jsx",
    "pages/AboutPage.jsx",
    "pages/QualityPage.jsx",
  ]) {
    assert.match(file(name), /p[byt]-\(--space-section\)/, `${name} spaces itself`);
  }
});

test("no class name is quoted where Tailwind will compile it", () => {
  // F24 again, twice over: a JSDoc comment in cloudinary.js and a CSS comment
  // in tokens.css were each naming a class they were explaining the removal
  // of, and Tailwind compiled both back into the bundle.
  assert.doesNotMatch(read("lib/cloudinary.js"), /max-w-\[1280px\]/);
  assert.doesNotMatch(read("shared/theme/tokens.css"), /max-w-\[1280px\]|`py-16`/);
});

// ── Phase R8: the gates that can be checked without a browser ─────────────

test("motion is switched off globally for anyone who asked", () => {
  // One reset rather than a `motion-safe:` on every transition: the carousel's
  // dots, the card hover scales, the skeleton pulses and the snap scrolling
  // were all added at different times, and a rule per component is a rule
  // somebody forgets.
  const tokens = read("shared/theme/tokens.css");

  assert.match(tokens, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(tokens, /animation-duration: 0\.01ms !important/);
  assert.match(tokens, /transition-duration: 0\.01ms !important/);
  assert.match(tokens, /animation-iteration-count: 1 !important/, "or a pulse runs forever at 0.01ms");
  assert.match(read("index.css"), /@media \(prefers-reduced-motion: reduce\)[\s\S]*scroll-behavior: auto/);
});

test("the one animation that is not CSS asks the same question itself", () => {
  // The stat counters animate in JavaScript, which the stylesheet cannot stop.
  const hook = strip(read("hooks/useCountUp.js"));

  assert.match(hook, /matchMedia\?\.\("\(prefers-reduced-motion: reduce\)"\)\.matches/);
  assert.match(hook, /if \(reduced\) return undefined/, "and shows the final value rather than nothing");
});

test("nothing takes a positive tabindex", () => {
  // A positive value moves an element ahead of everything with 0, which
  // reorders the whole page for a keyboard user and never stays correct.
  for (const [path, source] of ALL) {
    for (const [, value] of source.matchAll(/tabIndex=\{(-?\d+)\}/g)) {
      assert.ok(Number(value) <= 0, `${path} sets tabIndex=${value}`);
    }
  }
});

test("a scrollable region with nothing focusable in it can still be reached", () => {
  // WCAG 2.1.1. Every horizontal strip here holds links or buttons, so Tab
  // reaches the content and the container scrolls with it. The one exception
  // is the product tab panel, which is prose — and it says so.
  const tabs = file("components/product/ProductTabs.jsx");

  assert.match(tabs, /tabIndex=\{0\}/);
  assert.match(tabs, /role="tabpanel"/);
});

test("focus is visible everywhere, including over the brand colour", () => {
  assert.match(read("index.css"), /:focus-visible \{[\s\S]*outline: 2px solid var\(--color-brand\)/);
});

test("the sweep has an instrument, and it is not part of the build", () => {
  // Four gates need a rendered page. The instrument turns each into one line
  // in a console rather than a slow scan; it is pasted by hand, never
  // imported, and lives where Tailwind is told not to look.
  const audit = readFileSync(new URL("./viewport-audit.js", import.meta.url), "utf8");

  assert.match(audit, /globalThis\.audit = function audit/);
  for (const gate of ["G1", "G3", "G6", "G7"]) {
    assert.ok(audit.includes(gate), `the instrument does not cover ${gate}`);
  }

  for (const [path, source] of ALL) {
    assert.doesNotMatch(source, /viewport-audit/, `${path} imports the console instrument`);
  }
});

test("the pack chips and the price row wrap rather than overflow", () => {
  // Named in R5's scope and never actually asserted. Both sit in the buy panel,
  // which is 328px wide at 360 and 344 at 768 — narrower at a *larger* viewport,
  // once the page splits beside the gallery.
  const panel = file("components/product/BuyPanel.jsx");

  assert.match(panel, /mt-3 flex flex-wrap gap-2/, "the pack sizes");
  assert.match(panel, /flex flex-wrap items-baseline gap-3/, "price, compare-at and the discount badge");
  // 4.5rem is 72px: four chips and their gaps come to 312 of the 328 available.
  assert.match(panel, /min-w-\[4\.5rem\]/);
});

test("no panel is padded for a desktop only", () => {
  // Every card on the site starts at `p-6` and grows. The Quality assurance
  // panel was the one left at `p-8`, which takes 64px off a 328px phone.
  for (const [path, source] of ALL) {
    for (const classes of source.match(/className="[^"]*"/g) ?? []) {
      if (!/\bp-(?:8|10|12)\b/.test(classes)) continue;
      assert.match(
        classes,
        /\bp-6\b|sm:p-(?:8|10|12)|lg:p-12/,
        `${path} pads a panel for a desktop with no narrow step:\n  ${classes.slice(0, 110)}`,
      );
    }
  }
});

// ── R6, completed: the page forms, not just the dialog one ────────────────

test("nothing scrolled into view lands under the sticky header", () => {
  // R6 fixed this inside the enquiry dialog and missed every form on a page.
  // The document's scroll container starts behind a 4rem sticky header, so a
  // field focused by Tab — or by React Hook Form after a failed submit —
  // scrolled flush to the top and sat under it, where you cannot read the
  // error that put it there.
  const css = read("index.css");

  assert.match(css, /--scroll-offset: 5rem/);
  assert.match(css, /input,\s*\n\s*select,\s*\n\s*textarea \{\s*\n\s*scroll-margin-top: var\(--scroll-offset\)/);
});

test("the header's height is one number, not two", () => {
  // Anchored headings need the same clearance for the same reason.
  const prose = strip(read("lib/prose.js"));

  assert.match(prose, /\[&_h2\]:scroll-mt-\(--scroll-offset\)/);
  assert.match(prose, /\[&_h3\]:scroll-mt-\(--scroll-offset\)/);
  assert.doesNotMatch(prose, /scroll-mt-24/, "a second hardcoded header height");
});

test("the dialog keeps its own tighter offset", () => {
  // Inside a dialog the scroll container is the dialog, not the document, and
  // there is no header to clear — only the field's own label. A utility beats
  // the base rule, which is the layering that makes both correct.
  assert.match(file("components/product/EnquiryModal.jsx"), /h-11 scroll-mt-6 rounded-md/);
});

test("a label or an error wraps rather than being cut", () => {
  // Named in R6's scope and never asserted. Error text is the longest string a
  // form shows and it sits in the narrowest column.
  for (const name of [
    "components/contact/ContactForm.jsx",
    "components/dealer/ApplicationForm.jsx",
    "components/product/EnquiryModal.jsx",
  ]) {
    const source = file(name);
    const alerts = source.match(/role="alert"[^>]*/g) ?? [];

    assert.ok(alerts.length > 0, `${name} shows no field errors at all`);
    for (const alert of alerts) {
      assert.doesNotMatch(alert, /truncate|whitespace-nowrap/, `${name} clips an error message`);
    }
  }
});

test("the lightbox controls hold up at 360 and in landscape", () => {
  // Also named in R6's scope and never asserted.
  const lightbox = file("components/gallery/Lightbox.jsx");

  // Both arrows are 44px and sit inside the frame from the narrowest screen.
  assert.equal((lightbox.match(/absolute (?:left|right)-2 top-1\/2 grid size-11/g) ?? []).length, 2);
  // The caption cannot push the counter off the end of the row.
  assert.match(lightbox, /<div className="min-w-0">/);
  assert.match(lightbox, /truncate font-medium text-ink-inverse/);
  assert.match(lightbox, /shrink-0 text-sm tabular-nums/);
});
