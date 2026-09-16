import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

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

test("the whole page comes from a single /public/home request", () => {
  assert.match(page, /publicApi\.get\("\/public\/home"\)/);

  // No section may fetch anything of its own — that is what would turn one
  // round trip into six.
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
  assert.match(hero, /<Slide banner=\{current\} priority \/>/);

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
  for (const file of homeFiles) {
    assert.match(file.source, /if \(![\w.?]+\??\.length\) return null|if \(slides\.length === 0\) return null/, `${file.path} has no empty guard`);
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
