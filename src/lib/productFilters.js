/**
 * The product listing's filter state, as it lives in the URL (§10.2).
 *
 * Both of RTPP-60's acceptance criteria are really one property: the URL is the
 * state. Copying it must reproduce the view, and Back must step through filter
 * changes — neither works if any part of the filter lives only in a component.
 * So this module is the whole of it, and it is pure.
 *
 * Defaults are **omitted** from the URL rather than written out. `/products`
 * and `/products?page=1&category=` are the same view, and a visitor copying a
 * link should get the short one. It also means "is anything filtered" is just
 * "does the query string have anything in it".
 */

export const DEFAULT_SORT = "newest";
export const PAGE_SIZE = 12;

// From the API's own enum. An unrecognised value falls back rather than being
// rejected — the endpoint does the same, deliberately, so a stale link from an
// old build degrades to the default listing instead of erroring the page.
export const SORTS = ["newest", "name", "price_asc", "price_desc", "rating"];

const toPage = (value) => {
  const page = Number.parseInt(value, 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

/** Read the filter state out of a URLSearchParams. */
export function parseFilters(searchParams) {
  const get = (key) => searchParams?.get?.(key) ?? null;
  const sort = get("sort");

  return {
    category: get("category")?.trim() || null,
    search: get("search")?.trim() || null,
    sort: SORTS.includes(sort) ? sort : DEFAULT_SORT,
    page: toPage(get("page")),
  };
}

/**
 * Write the filter state back to a query string, dropping anything at its
 * default. Returns a `URLSearchParams`, so the caller decides push or replace.
 */
export function toSearchParams(filters) {
  const params = new URLSearchParams();

  if (filters?.category) params.set("category", filters.category);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.sort && filters.sort !== DEFAULT_SORT) params.set("sort", filters.sort);
  if (filters?.page && filters.page > 1) params.set("page", String(filters.page));

  return params;
}

/**
 * Apply a change and return the next filter state.
 *
 * Changing a filter resets to page 1: page 3 of "all products" is not page 3 of
 * "green tea", and keeping it usually lands on an empty page that reads as "no
 * products" rather than "you are past the end".
 */
export function withFilter(filters, patch) {
  const next = { ...filters, ...patch };
  const changedFilter = Object.keys(patch).some((key) => key !== "page");

  return changedFilter ? { ...next, page: 1 } : next;
}

/** The query the API is actually called with. */
export function toQueryParams(filters) {
  return {
    page: filters?.page ?? 1,
    limit: PAGE_SIZE,
    // undefined rather than null or "": the client drops undefined, and
    // `category=` would filter to a category whose slug is the empty string.
    category: filters?.category ?? undefined,
    search: filters?.search ?? undefined,
    sort: filters?.sort && filters.sort !== DEFAULT_SORT ? filters.sort : undefined,
  };
}

/** Whether anything is narrowing the listing — drives the "Clear" affordance. */
export const isFiltered = (filters) =>
  Boolean(filters?.category || filters?.search || (filters?.sort && filters.sort !== DEFAULT_SORT));
