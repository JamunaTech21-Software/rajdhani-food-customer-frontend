import assert from "node:assert/strict";
import { test } from "node:test";

import {
  cloudinaryUrl,
  DEFAULT_WIDTHS,
  isCloudinaryUrl,
  SIZES,
  srcSet,
} from "../src/lib/cloudinary.js";

const BASE = "https://res.cloudinary.com/demo/image/upload";
const ASSET = `${BASE}/v1699999999/rajdhani/products/premium-tea.jpg`;

test("f_auto is what makes the WebP requirement true", () => {
  // RTPP-56's third criterion. f_auto negotiates from the Accept header, so
  // the browser is never asked and no format list is hardcoded.
  const url = cloudinaryUrl(ASSET);

  assert.match(url, /\/upload\/f_auto,q_auto\//);
  assert.equal(url, `${BASE}/f_auto,q_auto/v1699999999/rajdhani/products/premium-tea.jpg`);
});

test("a width is added as a w_ variant", () => {
  assert.equal(
    cloudinaryUrl(ASSET, { width: 768 }),
    `${BASE}/f_auto,q_auto,w_768/v1699999999/rajdhani/products/premium-tea.jpg`,
  );
});

test("a fractional width is rounded — Cloudinary takes integers", () => {
  assert.match(cloudinaryUrl(ASSET, { width: 767.5 }), /w_768/);
});

test("a non-Cloudinary URL is returned exactly as given", () => {
  // The seeded data serves placehold.co. Splicing f_auto into that produces a
  // URL that 404s, and every image on the site would break.
  const placeholder = "https://placehold.co/512x512/1B5E20/FFFFFF/png?text=Rajdhani";

  assert.equal(cloudinaryUrl(placeholder), placeholder);
  assert.equal(cloudinaryUrl(placeholder, { width: 800 }), placeholder);
  assert.equal(isCloudinaryUrl(placeholder), false);
});

test("missing input does not become the string 'null'", () => {
  assert.equal(cloudinaryUrl(null), null);
  assert.equal(cloudinaryUrl(undefined), null);
  assert.equal(isCloudinaryUrl(null), false);
});

test("an existing transformation is kept, not overwritten", () => {
  // A caller that already asked for a crop must keep it.
  const cropped = `${BASE}/c_fill,g_auto,h_400/v1/x.jpg`;

  assert.equal(cloudinaryUrl(cropped, { width: 800 }), `${BASE}/f_auto,q_auto,w_800/c_fill,g_auto,h_400/v1/x.jpg`);
});

test("running twice does not stack two transformation segments", () => {
  // Re-deriving a URL from an already-built one is easy to do by accident in a
  // memoised component, and produces .../f_auto,q_auto/f_auto,q_auto,w_800/...
  const once = cloudinaryUrl(ASSET, { width: 400 });
  const twice = cloudinaryUrl(once, { width: 800 });

  assert.equal(twice, `${BASE}/f_auto,q_auto,w_800/v1699999999/rajdhani/products/premium-tea.jpg`);
  assert.equal((twice.match(/f_auto/g) ?? []).length, 1);
});

test("a version segment is not mistaken for a transformation", () => {
  // v1699999999 matches nothing in the transformation grammar, but a naive
  // check on "has a slash-delimited segment" would treat it as one.
  assert.match(cloudinaryUrl(ASSET), /f_auto,q_auto\/v1699999999\//);
});

test("srcSet offers the documented breakpoints", () => {
  // §1533: 360, 768, 1024, 1440, 1920.
  assert.deepEqual(DEFAULT_WIDTHS, [360, 768, 1024, 1440, 1920]);

  const set = srcSet(ASSET);
  for (const width of DEFAULT_WIDTHS) {
    assert.ok(set.includes(`w_${width}`), `missing the ${width}px variant`);
    assert.ok(set.includes(`${width}w`), `missing the ${width}w descriptor`);
  }
  assert.equal(set.split(", ").length, DEFAULT_WIDTHS.length);
});

test("no srcSet for an image that cannot have variants", () => {
  // A one-entry srcSet tells the browser that width is the only option, which
  // is worse than omitting the attribute and letting src stand.
  assert.equal(srcSet("https://placehold.co/512x512.png"), null);
  assert.equal(srcSet(ASSET, []), null);
  assert.equal(srcSet(null), null);
});

test("every sizes value is a usable media-condition list", () => {
  // A wrong `sizes` silently downloads the wrong variant — the browser reads it
  // before layout, so nothing on screen reveals the mistake.
  for (const [name, value] of Object.entries(SIZES)) {
    assert.match(value, /(vw|px)$/, `SIZES.${name} does not end in a length`);
  }
  assert.equal(SIZES.full, "100vw");
  assert.match(SIZES.card, /^\(min-width: 1024px\) 25vw,/, "widest breakpoint first");
});
