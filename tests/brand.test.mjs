import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { brandLogo, BUNDLED_LOGO, isPlaceholderImage } from "../src/lib/brand.js";

const read = (path) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");

// The seeded row, verbatim from /public/layout.
const SEEDED = { url: "https://placehold.co/512x512/1B5E20/FFFFFF/png?text=Rajdhani", alt: "Rajdhani" };
const UPLOADED = {
  url: "https://res.cloudinary.com/rajdhani/image/upload/v1/rajdhani/logo.png",
  alt: "Rajdhani Food Products",
};

test("a placeholder is not a logo", () => {
  // It is what the API says when nobody has uploaded one — a green square
  // reading "Rajdhani", which is what the header was drawing.
  assert.equal(brandLogo(SEEDED, "Rajdhani Food Products").url, BUNDLED_LOGO);
  assert.equal(brandLogo(SEEDED).isBundled, true);
});

test("a real upload wins, with nothing to remember to undo", () => {
  // The point of doing it this way rather than hardcoding: the moment the
  // client uploads their own mark in the dashboard, it appears.
  const logo = brandLogo(UPLOADED, "Rajdhani Food Products");

  assert.equal(logo.url, UPLOADED.url);
  assert.equal(logo.alt, UPLOADED.alt);
  assert.equal(logo.isBundled, false);
});

test("there is always a mark, even with no logo row at all", () => {
  for (const input of [null, undefined, {}, { url: "" }]) {
    assert.equal(brandLogo(input, "Rajdhani Food Products").url, BUNDLED_LOGO);
  }
});

test("the alt text falls back to the site name rather than to nothing", () => {
  // The logo is the link home; an unnamed one is announced as "link".
  assert.equal(brandLogo(SEEDED, "Rajdhani Food Products").alt, "Rajdhani Food Products");
  assert.equal(brandLogo(null, null).alt, "Rajdhani Food Products");
  assert.equal(brandLogo({ ...UPLOADED, alt: null }, "Site").alt, "Site");
});

test("the placeholder hosts are matched on the host, not anywhere in the string", () => {
  assert.equal(isPlaceholderImage("https://placehold.co/64x64"), true);
  assert.equal(isPlaceholderImage("https://via.placeholder.com/64"), true);
  // A real asset that merely mentions one must not be mistaken for it.
  assert.equal(isPlaceholderImage("https://res.cloudinary.com/x/placehold.co-logo.png"), false);
  assert.equal(isPlaceholderImage(null), false);
});

test("the bundled file is where the build will serve it from", () => {
  // `public/` is not the Vite public directory on this project — `static/` is.
  // A logo dropped in `public/` 404s, which is exactly what happened.
  assert.equal(BUNDLED_LOGO, "/rajdhani-logo.png");
  assert.ok(read("static/rajdhani-logo.png").length > 0);
  assert.equal(existsSync(fileURLToPath(new URL("../static/favicon.svg", import.meta.url))), false, "an SVG icon here would win over the PNG");
  assert.match(read("vite.config.js"), /publicDir: "static"/);
});

test("the header draws whatever the helper decided", () => {
  const header = read("src/components/layout/Header.jsx");

  assert.match(header, /brandLogo\(site\?\.logos\?\.light, site\?\.name\)/);
  assert.match(header, /src=\{logo\.url\}/);
  assert.doesNotMatch(header, /site\?\.logos\?\.light;/, "the raw API value is still being used");
});

test("the tab carries the mark, and nothing competes with it", () => {
  // Declaring the leaf SVG alongside it did not mean "prefer the PNG": Chrome
  // and Firefox take an SVG over a raster whenever one is offered, whatever the
  // order, so the PNG would never have been the icon anyone saw.
  const html = read("index.html");

  assert.match(html, /<link rel="icon" type="image\/png" href="\/rajdhani-logo\.png" \/>/);
  assert.equal((html.match(/rel="icon"/g) ?? []).length, 1, "a second icon would win over it");
  assert.doesNotMatch(html, /favicon\.svg/);
});
