/**
 * The product catalogue, as a CSV file.
 *
 * Pure string work — no DOM, no `config.js` — so every rule below can be
 * asserted directly rather than inferred from a downloaded file. The site
 * origin arrives as a parameter for the same reason it does in `seo.js`.
 *
 * Built in the browser rather than fetched, because there is no export
 * endpoint: `/public/products/export`, `/public/products.csv` and
 * `/public/export/products` all 404. If one is ever added, this file is what
 * it should agree with.
 */

/** The dangerous leading characters, and why they are dangerous. */
const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * One cell, escaped for RFC 4180 **and** for Excel.
 *
 * Two separate problems, and the second is the one that gets missed:
 *
 *   * **Quoting.** A value containing a comma, a quote or a newline has to be
 *     wrapped, and an inner `"` doubled. A product description with a comma in
 *     it would otherwise silently become two columns.
 *   * **Formula injection.** Excel and Sheets *evaluate* a cell beginning with
 *     `=`, `+`, `-`, `@` or a tab. These values come from a CMS an editor
 *     types into, so a product named `=HYPERLINK(...)` would run on the
 *     machine of whoever opens the file. Prefixing with an apostrophe is the
 *     standard mitigation: Excel reads it as "text follows" and does not show
 *     it.
 *
 * Numbers skip the injection guard — we format those ourselves, so a negative
 * price is a number and not an attack, and `'-50` in a price column would be
 * unusable as a number in the spreadsheet.
 */
export function csvCell(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";

  const text = String(value);
  const guarded = FORMULA_START.test(text) ? `'${text}` : text;

  return /[",\r\n]/.test(guarded) ? `"${guarded.replaceAll('"', '""')}"` : guarded;
}

/**
 * A whole CSV document.
 *
 * **CRLF and a byte-order mark**, neither of which is decoration:
 *
 *   * RFC 4180 specifies CRLF, and Excel on Windows is the likeliest consumer
 *     of a file called "catalogue".
 *   * Without the BOM, Excel reads a UTF-8 file as the system code page. Every
 *     non-ASCII character in a product name — a Bangla title, a curly
 *     apostrophe, the `৳` sign — arrives as mojibake. The three bytes are the
 *     whole fix.
 */
export function toCsv(columns, rows) {
  const line = (cells) => cells.map(csvCell).join(",");

  const body = [
    line(columns.map((column) => column.header)),
    ...rows.map((row) => line(columns.map((column) => row[column.key]))),
  ];

  return `\uFEFF${body.join("\r\n")}\r\n`;
}

/**
 * What a catalogue row holds.
 *
 * The **list** endpoint's fields, which is a deliberate limit: pack sizes and
 * SKUs live only on `/public/products/{slug}`, so including them would cost
 * one request per product. Agreed as out of scope; if the client wants SKUs
 * later, that is where they come from.
 *
 * `url` is here because a catalogue whose reader cannot get back to the
 * product page is a dead end, and a spreadsheet makes a link trivial to
 * follow.
 */
export const CATALOGUE_COLUMNS = [
  { key: "name", header: "Product" },
  { key: "category", header: "Category" },
  { key: "tagline", header: "Tagline" },
  { key: "description", header: "Description" },
  { key: "price", header: "Price (BDT)" },
  { key: "comparePrice", header: "Was (BDT)" },
  { key: "discount", header: "Discount (%)" },
  { key: "badge", header: "Badge" },
  { key: "rating", header: "Rating" },
  { key: "reviews", header: "Reviews" },
  { key: "url", header: "Page" },
  { key: "image", header: "Image" },
];

/** A number the spreadsheet can add up, or blank — never the string "null". */
const numeric = (value) => {
  if (value === null || value === undefined || value === "") return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : "";
};

export function catalogueRows(products, { siteUrl = "" } = {}) {
  const origin = String(siteUrl ?? "").replace(/\/+$/, "");

  return (Array.isArray(products) ? products : []).map((product) => ({
    name: product?.name ?? "",
    category: product?.category?.name ?? "",
    tagline: product?.tagline ?? "",
    description: product?.short_description ?? "",
    price: numeric(product?.price),
    comparePrice: numeric(product?.compare_price),
    discount: numeric(product?.discount_percent),
    badge: product?.badge_text ?? "",
    // Blank rather than 0 at no reviews: a spreadsheet averaging the column
    // would otherwise be dragged down by products nobody has rated, which is
    // the same reason the Product JSON-LD omits `aggregateRating` entirely.
    rating: Number(product?.rating_count) > 0 ? numeric(product?.rating_average) : "",
    reviews: numeric(product?.rating_count) || 0,
    url: product?.slug && origin ? `${origin}/products/${product.slug}` : "",
    image: product?.image?.url ?? "",
  }));
}

/** `rajdhani-food-products-catalogue-2026-09-20.csv`. */
export function catalogueFilename(siteName, date = new Date()) {
  // The brand prefixes the name; without one the file is just the catalogue.
  // Defaulting the *slug* to "catalogue" instead gave "catalogue-catalogue-…".
  const slug = String(siteName ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const day = Number.isNaN(date?.getTime?.()) ? new Date() : date;
  const stamp = [
    day.getFullYear(),
    String(day.getMonth() + 1).padStart(2, "0"),
    String(day.getDate()).padStart(2, "0"),
  ].join("-");

  return `${slug ? `${slug}-` : ""}catalogue-${stamp}.csv`;
}

/**
 * Every page of a paginated list, as one array.
 *
 * **The API caps `limit` at 100 and does not say so** — ask for 500 and the
 * response comes back with `limit: 100` and a `totalPages` computed against
 * it. A single request would therefore ship a silently truncated catalogue the
 * day the client publishes their 101st product, and nothing would look wrong.
 *
 * Takes the fetcher as a parameter so the paging can be tested without a
 * network or a `config.js` import.
 */
export async function fetchAllPages(fetchPage, { limit = 100, maxPages = 50 } = {}) {
  const first = await fetchPage({ page: 1, limit });
  const items = [...(first?.items ?? [])];

  // A guard, not a limit anyone should reach: a `totalPages` the server got
  // wrong would otherwise loop forever against a live API.
  const pages = Math.min(Number(first?.meta?.totalPages) || 1, maxPages);

  for (let page = 2; page <= pages; page += 1) {
    const next = await fetchPage({ page, limit });
    items.push(...(next?.items ?? []));
  }

  return items;
}
