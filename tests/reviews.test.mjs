import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import {
  averageRating,
  distributionRows,
  EMPTY_REVIEW,
  ownReviewFor,
  reviewSchema,
  STARS,
  submissionState,
  toReviewPayload,
} from "../src/lib/reviews.js";

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

// ── The form ──────────────────────────────────────────────────────────────

const valid = { rating: 5, title: "Excellent", comment: "Strong and consistent, batch after batch." };

test("a rating and a comment are required, a title is not", () => {
  assert.equal(reviewSchema.safeParse(valid).success, true);
  assert.equal(reviewSchema.safeParse({ ...valid, title: undefined }).success, true);
  assert.equal(reviewSchema.safeParse({ ...valid, comment: "   " }).success, false);
});

test("no rating chosen is a validation error, not a zero sent to the API", () => {
  // `EMPTY_REVIEW` opens at 0, which is outside the 1–5 the schema accepts.
  const result = reviewSchema.safeParse(EMPTY_REVIEW);

  assert.equal(result.success, false);
  assert.match(result.error.issues[0].message, /choose a rating/);
});

test("the rating is a number, because a radio value is a string", () => {
  // `"4"` from a radio group is a 422, and it is the kind of thing that only
  // shows up once someone submits.
  assert.equal(reviewSchema.safeParse({ ...valid, rating: "4" }).success, false);
  assert.equal(typeof toReviewPayload(valid).rating, "number");
  assert.equal(toReviewPayload({ ...valid, rating: "4" }).rating, 4, "and it is coerced on the way out");
});

test("the API's own limits are enforced here", () => {
  assert.equal(reviewSchema.safeParse({ ...valid, rating: 6 }).success, false);
  assert.equal(reviewSchema.safeParse({ ...valid, rating: 0 }).success, false);
  assert.equal(reviewSchema.safeParse({ ...valid, rating: 4.5 }).success, false, "integers only");
  assert.equal(reviewSchema.safeParse({ ...valid, title: "a".repeat(256) }).success, false);
});

test("both of §14.2's defences ride along, even though this form needs a token", () => {
  // The doc lists "review" alongside the four anonymous forms.
  const body = toReviewPayload(valid, { recaptchaToken: "tok" });

  assert.equal(body.website, "");
  assert.equal(body.recaptcha_token, "tok");
});

test("an empty title is omitted rather than sent as a blank", () => {
  assert.equal(toReviewPayload({ ...valid, title: "  " }).title, undefined);
  assert.equal(toReviewPayload({ ...valid, title: "Good" }).title, "Good");
});

test("the payload carries only what the API accepts", () => {
  assert.deepEqual(Object.keys(toReviewPayload(valid, { recaptchaToken: "t" })).sort(), [
    "comment",
    "rating",
    "recaptcha_token",
    "title",
    "website",
  ]);
});

// ── Who sees what ─────────────────────────────────────────────────────────

test("the four states of the panel", () => {
  assert.equal(submissionState({ session: "unknown" }), "checking");
  assert.equal(submissionState({ session: "anonymous" }), "sign-in");
  assert.equal(submissionState({ session: "authenticated" }), "write");
  assert.equal(
    submissionState({ session: "authenticated", ownReview: { status: "PENDING" } }),
    "pending",
  );
  assert.equal(
    submissionState({ session: "authenticated", ownReview: { status: "APPROVED" } }),
    "edit",
  );
});

test("a customer's own review is found by product", () => {
  // It is the one review they may see before anyone has approved it, and it is
  // how the tab knows to offer an edit rather than a second submission — a
  // second POST is a 409.
  const mine = [
    { id: "r1", product: { id: "p1" }, status: "APPROVED" },
    { id: "r2", product: { id: "p2" }, status: "PENDING" },
  ];

  assert.equal(ownReviewFor(mine, "p2").id, "r2");
  assert.equal(ownReviewFor(mine, "p3"), null);
  assert.equal(ownReviewFor(null, "p1"), null);
  assert.equal(ownReviewFor(mine, undefined), null);
});

// ── Wiring ────────────────────────────────────────────────────────────────

const panel = strip(read("components/product/ReviewsPanel.jsx"));
const form = strip(read("components/product/ReviewForm.jsx"));
const summary = strip(read("components/product/RatingSummary.jsx"));
const starInput = strip(read("components/product/StarInput.jsx"));

test("a submitted review is never added to the list on screen", () => {
  // The first acceptance criterion, and the way to break it is optimistic
  // insertion. The API creates a PENDING review; the list endpoint returns
  // approved ones. Showing it would be the front-end contradicting the server.
  assert.doesNotMatch(form, /setQueryData|items: \[.*review/);
  assert.match(form, /Our team reads every review before it appears here/);
  assert.match(panel, /queryFn: \(\) => publicApi\.list\(`\/public\/products\/\$\{encodeURIComponent\(product\.slug\)\}\/reviews`\)/);
});

test("editing says the review goes back for approval", () => {
  // PATCH resets the status unconditionally, so an approved review vanishes
  // from the public list the moment it is edited. A customer fixing a typo
  // otherwise sees it disappear and assumes it was removed.
  assert.match(form, /Edited reviews go back to our team for approval/);
  assert.match(panel, /reviews\.refetch\(\);/, "and the public list is re-read");
});

test("the summary is fed meta, and the list length only as a caption", () => {
  assert.match(panel, /<RatingSummary meta=\{meta\} shown=\{items\.length\} \/>/);
  assert.match(summary, /distributionRows\(meta\)/);
  assert.doesNotMatch(summary, /reviews\.length|items\.length/, "nothing is counted from the page");
});

test("the summary says so when it describes more than is shown", () => {
  assert.match(summary, /Showing \{shown\} of \{total\} reviews/);
  assert.match(summary, /shown > 0 && shown < total/, "and only when the two differ");
});

test("the star input is a radio group, not five buttons", () => {
  // Five buttons look identical and behave almost identically, and then arrow
  // keys do nothing and nothing is announced as selected.
  assert.match(starInput, /type="radio"/);
  assert.match(starInput, /<fieldset/);
  assert.match(starInput, /<legend/);
  assert.match(starInput, /\{star\} star\{star === 1 \? "" : "s"\}, \{LABELS\[star\]\}/, "each option is named");
});

test("hovering previews but focusing does not", () => {
  // Tabbing into a group lands on the checked radio; previewing there would
  // show a rating the customer has not chosen as though they had.
  assert.match(starInput, /onMouseEnter=\{\(\) => setHovered\(star\)\}/);
  assert.doesNotMatch(starInput, /onFocus=\{\(\) => setHovered/);
});

test("a signed-out visitor sees the list and is told why they cannot write", () => {
  assert.match(panel, /state === "sign-in"/);
  assert.match(panel, /to="\/account"/);
  assert.match(panel, /Anyone can read them; only customers can add one/);
});

test("a 409 is explained rather than reported as a failure", () => {
  // One review per customer per product. Reaching it means the tab did not
  // know about an existing one — a review written in another tab.
  assert.match(form, /ErrorCode\.CONFLICT/);
  assert.match(form, /already reviewed this product/);
});

test("the edit endpoint is not sent the honeypot or a token", () => {
  // It is not one of §14.2's five forms, and the shared ReviewInput schema has
  // neither field.
  assert.match(form, /accountApi\.patch\(`\/public\/my\/reviews\/\$\{encodeURIComponent\(ownReview\.id\)\}`, \{/);
  assert.match(form, /rating: body\.rating,\s*\n\s*title: body\.title \?\? null,\s*\n\s*comment: body\.comment,/);
});

test("the own-review query is keyed by customer", () => {
  assert.match(panel, /queryKey: \["account", "reviews", customer\?\.id\]/);
});

test("the placeholder panel is gone from the page", () => {
  const page = strip(read("pages/ProductDetailPage.jsx"));

  assert.doesNotMatch(page, /function ReviewsPanel/);
  assert.match(page, /import \{ ReviewsPanel \}/);
});
