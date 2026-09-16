/**
 * The product detail page's derivations (§10.2).
 *
 * Both of RTPP-61's acceptance criteria live here — "switching pack size
 * updates every dependent field" and "a product with only two populated tabs
 * shows exactly two tabs" — so both are testable without rendering anything.
 */

/**
 * The tabs a product actually has content for, in the order §10.2 lists them.
 *
 * **Empty tabs are hidden, never shown blank.** The live catalogue makes that
 * concrete rather than theoretical: one product has description, ingredients
 * and brewing guide; another has only a description. A fixed six-tab strip
 * would give most products four dead tabs that open onto nothing.
 *
 * Reviews are the exception — the tab appears whether or not there are any,
 * because it is also where a customer *writes* one.
 */
const TAB_FIELDS = [
  { id: "description", label: "Description", field: "description" },
  { id: "ingredients", label: "Ingredients", field: "ingredients" },
  { id: "nutrition", label: "Nutrition Information", field: "nutrition_info" },
  { id: "brewing", label: "Brewing Guide", field: "brewing_guide" },
  { id: "packaging", label: "Packaging", field: "packaging_info" },
];

/** Rich text that is only empty markup still counts as empty. */
const hasContent = (value) => {
  if (typeof value !== "string") return false;
  return value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length > 0;
};

export function visibleTabs(product, { reviewCount = 0 } = {}) {
  const tabs = TAB_FIELDS.filter((tab) => hasContent(product?.[tab.field])).map((tab) => ({
    id: tab.id,
    label: tab.label,
    html: product[tab.field],
  }));

  tabs.push({
    id: "reviews",
    // The count belongs in the label — it is the one tab whose worth a visitor
    // can judge before opening it.
    label: reviewCount > 0 ? `Reviews (${reviewCount})` : "Reviews",
    html: null,
  });

  return tabs;
}

/**
 * Which pack size to show first.
 *
 * `is_default` is the admin's choice and wins. Failing that, the first
 * available one — opening on a sold-out size would show a price nobody can buy.
 */
export function defaultPackSize(packSizes) {
  const sizes = [...(packSizes ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  if (sizes.length === 0) return null;

  return (
    sizes.find((size) => size.is_default && size.is_available !== false) ??
    sizes.find((size) => size.is_available !== false) ??
    sizes[0]
  );
}

export const sortedPackSizes = (packSizes) =>
  [...(packSizes ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

/**
 * Everything that changes when the selected pack size changes.
 *
 * Returned as one object rather than read field-by-field at the call sites, so
 * "updates *every* dependent field" is a single assignment that cannot go half
 * done — the failure mode this criterion guards against is a price that moves
 * while the SKU beside it does not.
 */
export function packDetails(pack) {
  if (!pack) {
    return { sku: null, price: null, comparePrice: null, discountPercent: null, includesVat: false, available: false };
  }

  const price = Number.isFinite(pack.price) ? pack.price : null;
  const compare = Number.isFinite(pack.compare_price) ? pack.compare_price : null;

  // Only a *higher* compare price is a saving. A compare price at or below the
  // real one is stale data, and showing "£300 £280" struck through when the
  // numbers say otherwise would be a false discount claim.
  const showsSaving = price !== null && compare !== null && compare > price;

  return {
    sku: pack.sku ?? null,
    price,
    comparePrice: showsSaving ? compare : null,
    // Prefer the API's own figure; derive only when it is absent, so the badge
    // never disagrees with what the server computed.
    discountPercent: showsSaving
      ? (Number.isFinite(pack.discount_percent) && pack.discount_percent > 0
          ? pack.discount_percent
          : Math.round(((compare - price) / compare) * 100))
      : null,
    includesVat: pack.price_includes_vat === true,
    available: pack.is_available !== false,
  };
}

/** Bangladeshi Taka, as the catalogue quotes it. */
const taka = new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  minimumFractionDigits: 2,
});

export const formatPrice = (value) => (Number.isFinite(value) ? taka.format(value) : null);

/** The breadcrumb trail, skipping a category the product does not have. */
export function breadcrumbFor(product) {
  const trail = [
    { label: "Home", to: "/" },
    { label: "Products", to: "/products" },
  ];

  if (product?.category?.slug) {
    trail.push({
      label: product.category.name,
      to: `/products?category=${encodeURIComponent(product.category.slug)}`,
    });
  }

  if (product?.name) trail.push({ label: product.name, to: null });

  return trail;
}
