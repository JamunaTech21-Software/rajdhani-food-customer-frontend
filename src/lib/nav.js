/**
 * Navigation logic — which link is current, and what the Products menu contains.
 *
 * Pure, because "is this link active" is the sort of thing that looks obvious
 * and is not: `/products` must light up on `/products/premium-tea` but `/` must
 * not light up on everything, and an absolute URL to another site is never
 * current no matter what the path says.
 */

/** Trailing slashes are not a difference: `/about/` and `/about` are one page. */
const normalise = (path) => {
  const value = String(path ?? "").split(/[?#]/)[0];
  if (value.length > 1 && value.endsWith("/")) return value.slice(0, -1);
  return value || "/";
};

export const isExternal = (url) => /^(https?:|mailto:|tel:)/i.test(String(url ?? ""));

/**
 * Whether a nav link points at the page currently open.
 *
 * `/` matches only itself — treating it as a prefix would mark Home active on
 * every page, which is the commonest version of this bug.
 */
export function isActiveLink(pathname, url) {
  if (!url || isExternal(url)) return false;

  const here = normalise(pathname);
  const target = normalise(url);

  if (target === "/") return here === "/";
  return here === target || here.startsWith(`${target}/`);
}

/**
 * The header link a section belongs to, so a product page keeps "Products" lit.
 * Returns the matching link, or null.
 */
export const activeLink = (pathname, links) =>
  (links ?? []).find((link) => isActiveLink(pathname, link.url)) ?? null;

/**
 * The Products dropdown's contents.
 *
 * **Every category, including empty ones.** RTPP-58's first acceptance criterion
 * is that adding a category in admin puts it in this dropdown — filtering on
 * `product_count > 0` would mean a newly created category stays invisible until
 * someone adds a product to it, which fails that criterion outright.
 *
 * Ordering follows the API, which sorts by the admin's drag order — the same
 * order that drives the public filter bar.
 */
export function categoryLinks(categories) {
  return (categories ?? [])
    .filter((category) => category?.slug)
    .map((category) => ({
      id: category.id,
      label: category.name,
      url: `/products?category=${encodeURIComponent(category.slug)}`,
      iconName: category.icon_name ?? null,
      productCount: category.product_count ?? 0,
    }));
}

/** "All Products" sits above the categories and is not one of them. */
export const ALL_PRODUCTS = { id: "all", label: "All Products", url: "/products" };
