import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_SORT,
  isFiltered,
  parseFilters,
  PAGE_SIZE,
  SORTS,
  toQueryParams,
  toSearchParams,
  withFilter,
} from "../src/lib/productFilters.js";

const parse = (query) => parseFilters(new URLSearchParams(query));

// ── Criterion 1: copying the URL reproduces the view ──────────────────────

test("every filter state survives a round trip through the URL", () => {
  // This is the criterion, stated directly: parse(serialise(x)) === x.
  const states = [
    { category: null, search: null, sort: "newest", page: 1 },
    { category: "green-tea", search: null, sort: "newest", page: 1 },
    { category: "green-tea", search: null, sort: "price_asc", page: 3 },
    { category: null, search: "masala", sort: "rating", page: 2 },
  ];

  for (const state of states) {
    const url = toSearchParams(state).toString();
    assert.deepEqual(parse(url), state, `lost something in: ?${url}`);
  }
});

test("defaults are left out of the URL entirely", () => {
  // /products and /products?page=1&sort=newest are the same view; a copied link
  // should be the short one.
  assert.equal(toSearchParams({ category: null, sort: "newest", page: 1 }).toString(), "");
  assert.equal(toSearchParams({ category: "green-tea", sort: "newest", page: 1 }).toString(), "category=green-tea");
});

test("a slug needing encoding survives both directions", () => {
  const url = toSearchParams({ category: "special blends", sort: DEFAULT_SORT, page: 1 }).toString();

  assert.match(url, /category=special\+blends|category=special%20blends/);
  assert.equal(parse(url).category, "special blends");
});

// ── Robustness: a hand-edited or stale URL must not break the page ────────

test("a nonsense sort falls back rather than breaking the listing", () => {
  // The endpoint does the same deliberately, so a stale link from an old build
  // degrades to the default listing instead of erroring the whole page.
  assert.equal(parse("sort=nonsense").sort, DEFAULT_SORT);
  assert.equal(parse("sort=").sort, DEFAULT_SORT);
});

test("a nonsense page falls back to the first", () => {
  for (const query of ["page=0", "page=-3", "page=abc", "page=", "page=1.5"]) {
    assert.equal(parse(query).page, 1, `${query} should read as page 1`);
  }
});

test("an empty or whitespace filter is the same as no filter", () => {
  // ?category= would otherwise filter to a category whose slug is "".
  assert.equal(parse("category=").category, null);
  assert.equal(parse("category=%20%20").category, null);
  assert.equal(parse("search=%20").search, null);
});

test("missing params do not throw", () => {
  assert.deepEqual(parseFilters(null), { category: null, search: null, sort: DEFAULT_SORT, page: 1 });
  assert.deepEqual(parseFilters(undefined).page, 1);
});

test("an unknown category is carried through, not swallowed", () => {
  // The API answers an unknown slug with total: 0 rather than an error, so the
  // page can say "nothing matches" — which needs the slug to reach it.
  assert.equal(parse("category=does-not-exist").category, "does-not-exist");
});

// ── Criterion 2: back/forward through filter states ───────────────────────

test("changing a filter returns to page one", () => {
  // Page 3 of "all products" is not page 3 of "green tea" — keeping it usually
  // lands on an empty page that reads as "no products" rather than "past the end".
  const at = { category: null, search: null, sort: DEFAULT_SORT, page: 3 };

  assert.equal(withFilter(at, { category: "green-tea" }).page, 1);
  assert.equal(withFilter(at, { sort: "name" }).page, 1);
  assert.equal(withFilter(at, { search: "tea" }).page, 1);
});

test("changing the page keeps the filters and the page", () => {
  const at = { category: "green-tea", search: null, sort: "name", page: 1 };
  const next = withFilter(at, { page: 2 });

  assert.equal(next.page, 2);
  assert.equal(next.category, "green-tea");
  assert.equal(next.sort, "name");
});

test("clearing a category is a change like any other", () => {
  const at = { category: "green-tea", search: null, sort: DEFAULT_SORT, page: 4 };
  const cleared = withFilter(at, { category: null });

  assert.equal(cleared.category, null);
  assert.equal(cleared.page, 1);
  assert.equal(toSearchParams(cleared).toString(), "", "and the URL goes back to bare /products");
});

// ── What actually gets sent to the API ────────────────────────────────────

test("empty filters are omitted from the request, not sent blank", () => {
  const query = toQueryParams(parse(""));

  assert.equal(query.category, undefined);
  assert.equal(query.search, undefined);
  assert.equal(query.sort, undefined, "the default sort is the API's own default");
  assert.equal(query.page, 1);
  assert.equal(query.limit, PAGE_SIZE);
});

test("a set filter is sent as the API names it", () => {
  // `category` takes a slug, not an id — the endpoint says so explicitly.
  const query = toQueryParams(parse("category=green-tea&sort=price_asc&page=2"));

  assert.equal(query.category, "green-tea");
  assert.equal(query.sort, "price_asc");
  assert.equal(query.page, 2);
});

test("the sort vocabulary matches the API's enum", () => {
  // Offering a sort the endpoint does not know would silently return the
  // default order while the UI claimed otherwise.
  assert.deepEqual(SORTS, ["newest", "name", "price_asc", "price_desc", "rating"]);
  assert.ok(SORTS.includes(DEFAULT_SORT));
});

test("isFiltered drives the Clear affordance honestly", () => {
  assert.equal(isFiltered(parse("")), false);
  assert.equal(isFiltered(parse("page=2")), false, "paging is not filtering");
  assert.equal(isFiltered(parse("category=green-tea")), true);
  assert.equal(isFiltered(parse("sort=name")), true);
});
