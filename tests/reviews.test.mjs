import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { averageRating, distributionRows, STARS } from "../src/lib/reviews.js";

const read = (path) => readFileSync(fileURLToPath(new URL(`../src/${path}`, import.meta.url)), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// The live envelope, verbatim — every product in the catalogue is at zero.
const EMPTY_META = {
  page: 1,
  limit: 12,
  total: 0,
  totalPages: 0,
  rating_average: 0,
  rating_count: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

const META = {
  page: 1,
  limit: 12,
  total: 30,
  rating_average: 4.3666,
  rating_count: 30,
  distribution: { 1: 0, 2: 1, 3: 2, 4: 8, 5: 19 },
};

// ── Criterion 2: the distribution matches the approved reviews ────────────

test("the bars come from the server's aggregate, not from the page", () => {
  // The list is paginated at twelve; the distribution covers every approved
  // review. Counting what is on screen would draw a chart of page one and
  // label it as the product's — and it would change as somebody paged.
  const rows = distributionRows(META);

  assert.deepEqual(rows.map((r) => r.stars), STARS);
  assert.deepEqual(rows.map((r) => r.count), [19, 8, 2, 1, 0]);
  assert.equal(rows.reduce((sum, r) => sum + r.count, 0), META.rating_count);
});

test("the percentages are of the whole, and add up", () => {
  const rows = distributionRows(META);

  assert.equal(rows.find((r) => r.stars === 5).percent, 63);
  assert.equal(rows.find((r) => r.stars === 4).percent, 27);
  assert.ok(Math.abs(rows.reduce((sum, r) => sum + r.percent, 0) - 100) <= 2, "rounding aside");
});

test("a product with no reviews has no bars rather than NaN ones", () => {
  // Which is every product in the catalogue today.
  for (const row of distributionRows(EMPTY_META)) {
    assert.equal(row.count, 0);
    assert.equal(row.percent, 0);
  }
  assert.equal(averageRating(EMPTY_META), null);
});

test("a missing or malformed meta does not take the tab down", () => {
  for (const meta of [null, undefined, {}, { distribution: null }, { rating_count: "lots" }]) {
    const rows = distributionRows(meta);
    assert.equal(rows.length, 5);
    for (const row of rows) assert.equal(Number.isFinite(row.percent), true);
  }
});

test("the distribution is read whether its keys are numbers or strings", () => {
  // JSON gives string keys; a literal in a test gives numbers. Both reach here.
  assert.equal(distributionRows({ rating_count: 2, distribution: { "5": 2 } })[0].count, 2);
  assert.equal(distributionRows({ rating_count: 2, distribution: { 5: 2 } })[0].count, 2);
});

test("the average is rounded for display, not recomputed", () => {
  assert.equal(averageRating(META), 4.4);
  assert.equal(averageRating({ rating_count: 1, rating_average: 5 }), 5);
  assert.equal(averageRating({ rating_count: 3, rating_average: "nonsense" }), null);
});

// ── Wiring ────────────────────────────────────────────────────────────────

const panel = strip(read("components/product/ReviewsPanel.jsx"));
const summary = strip(read("components/product/RatingSummary.jsx"));

test("the summary is fed meta, and the list length only as a caption", () => {
  assert.match(panel, /<RatingSummary meta=\{meta\} shown=\{items\.length\} \/>/);
  assert.match(summary, /distributionRows\(meta\)/);
  assert.doesNotMatch(summary, /reviews\.length|items\.length/, "nothing is counted from the page");
});

test("the summary says so when it describes more than is shown", () => {
  assert.match(summary, /Showing \{shown\} of \{total\} reviews/);
  assert.match(summary, /shown > 0 && shown < total/, "and only when the two differ");
});

test("the tab reads reviews and never writes one", () => {
  // The site has no sign-in, so there is nobody to attribute a submission to.
  // Reviews are written and approved in the admin panel and arrive here
  // already public. This is the guard on that: the form, the star input, the
  // "your review" states and the fetch of the customer's own review all went,
  // and a reader of this file should find out here rather than by grepping.
  assert.match(panel, /\/public\/products\/\$\{encodeURIComponent\(product\.slug\)\}\/reviews/);

  for (const gone of ["ReviewForm", "accountApi", "useAuthStore", "my\/reviews", "submissionState"]) {
    assert.doesNotMatch(panel, new RegExp(gone), `${gone} belongs to the removed account feature`);
  }
});
