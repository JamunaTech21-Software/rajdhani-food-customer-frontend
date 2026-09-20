/**
 * Metadata and structured data (§14.3, RTPP-71).
 *
 * Every builder here is a **pure function of API data**, which is the ticket's
 * own requirement and the reason it matters: RTPP-73's PHP shell renderer emits
 * the same tags server-side, and two implementations of the same rules drift
 * the first time one of them is corrected. These are the rules, written once,
 * in a form that can be read from PHP as a specification and checked here as a
 * test.
 *
 * Nothing in this file touches the DOM or reads configuration — the site URL
 * arrives as a parameter, for the same reason `newsJsonLd.js` takes one.
 */

const trimTrailing = (value) => String(value ?? "").replace(/\/+$/, "");

/** An absolute URL for a path, or null when there is no origin to build on. */
export function absoluteUrl(siteUrl, path = "/") {
  const origin = trimTrailing(siteUrl);
  if (!origin) return null;

  const suffix = String(path ?? "/");
  return `${origin}${suffix.startsWith("/") ? suffix : `/${suffix}`}`;
}

/**
 * The head for one route.
 *
 * Three layers, most specific first: what the page knows, what `seo_meta` says
 * for that page, and what `site_profile` carries as the site-wide default. The
 * fallbacks matter more than the overrides here — almost every `meta_title` in
 * the database is null today, so the site-level pair is what ships.
 *
 * `title` composes rather than replaces: "Green Tea — Rajdhani Food Products"
 * is what a search result should read, and asking every caller to append the
 * brand is asking for the one that forgets.
 */
export function resolveMeta({ title, description, image, path, site, siteUrl, absoluteTitle } = {}) {
  const siteName = site?.name ?? "Rajdhani Food Products";
  const fallbackTitle = site?.seo?.meta_title ?? siteName;
  const own = String(title ?? "").trim();

  return {
    title: own ? (absoluteTitle ? own : `${own} — ${siteName}`) : fallbackTitle,
    description:
      String(description ?? "").trim() || site?.seo?.meta_description || site?.tagline || "",
    canonical: absoluteUrl(siteUrl, path),
    image: image || site?.logos?.og?.url || null,
    siteName,
  };
}

/**
 * Titles and descriptions for the pages that have no record behind them.
 *
 * **This is a stand-in, and should be deleted.** The admin already has a
 * `seo_meta` table with a row per page, and the dashboard already edits it —
 * but nothing public serves it (`/public/seo`, `/public/seo-meta`,
 * `/public/seo/{page}` and `/public/pages/{page}` are all 404 today). Until one
 * of them exists, a description written here is the only thing standing between
 * these pages and a search result that reads out the site tagline eleven times.
 *
 * Kept in this file rather than in each page for the reason everything else
 * here is: RTPP-73's shell renderer needs the same strings, and it can read one
 * map far more easily than eleven JSX files. When `seo_meta` is exposed, these
 * become the fallback for a page the editor has not filled in yet.
 *
 * Under 160 characters each, which is roughly where Google truncates.
 */
export const PAGE_META = {
  about: {
    title: "About Us",
    description:
      "Four decades of tea from Bangladesh — who we are, how we got here, and the gardens and people behind every pack of Rajdhani tea.",
  },
  quality: {
    title: "Quality",
    description:
      "How every batch is tasted, tested and certified before it leaves us — our quality process, standards and certifications.",
  },
  contact: {
    title: "Contact Us",
    description:
      "Talk to Rajdhani Food Products about orders, supply or anything else. Phone, email, our address and a form that reaches the right desk.",
  },
  dealer: {
    title: "Become a Dealer",
    description:
      "Join the Rajdhani dealer network. What we look for, what you get, and the application form — we reply to every enquiry.",
  },
  gallery: {
    title: "Gallery",
    description:
      "Our gardens, factory, products and people, in photographs.",
  },
  news: {
    title: "News",
    description:
      "Announcements, harvest notes and company news from Rajdhani Food Products.",
  },
  products: {
    title: "Our Teas",
    description:
      "Browse the full Rajdhani range — black, green, premium and blended teas, in pack sizes from sachets to bulk supply.",
  },
  wishlist: {
    title: "Your Wishlist",
    description: "The teas you have saved, ready to enquire about together.",
  },
  account: {
    title: "Your Account",
    description: "Your profile, your reviews and your enquiries with Rajdhani Food Products.",
  },
  privacy: {
    title: "Privacy Policy",
    description:
      "What we collect when you use this site or contact us, why, and what we do with it.",
  },
  terms: {
    title: "Terms of Service",
    description: "The terms you agree to when you use the Rajdhani Food Products website.",
  },
};

/**
 * The canonical path for a listing.
 *
 * A category and a page number are pages in their own right — each holds
 * products or posts the others do not, and canonicalising page three onto page
 * one is how the items only reachable from page three stop being found at all.
 *
 * A **search term and a sort order are not**: they are the same items
 * rearranged. Left to itself a catalogue of ninety products would offer a
 * crawler a few thousand distinct URLs holding the same ninety.
 */
export function listingPath(base, { category = null, page = 1 } = {}) {
  const query = new URLSearchParams();
  if (category) query.set("category", category);
  if (Number(page) > 1) query.set("page", String(page));

  const suffix = query.toString();
  return suffix ? `${base}?${suffix}` : base;
}

/** " — Page 3", so the pages of a listing do not all share one title. */
export const pageSuffix = (page) => (Number(page) > 1 ? ` — Page ${page}` : "");

// ── JSON-LD ───────────────────────────────────────────────────────────────

/** Drop empty values — `"author": null` asserts there is none, which is worse. */
const compact = (object) =>
  Object.fromEntries(
    Object.entries(object).filter(([, value]) =>
      Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined && value !== "",
    ),
  );

/**
 * `Organization` — site-wide, and the thing a knowledge panel is built from.
 *
 * `sameAs` is the social profile list, which is exactly what `social_links`
 * holds. Google uses it to connect the site to those accounts; omitting it is
 * the commonest reason a correct Organization block does nothing visible.
 */
export function organizationJsonLd(site, { siteUrl, social } = {}) {
  const url = absoluteUrl(siteUrl, "/");
  if (!url || !site?.name) return null;

  const address = compact({
    "@type": "PostalAddress",
    streetAddress: site.contact?.address_line ?? null,
    addressLocality: site.contact?.city ?? null,
    addressCountry: site.contact?.country ?? null,
  });

  return compact({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url,
    logo: site.logos?.light?.url ?? null,
    description: site.seo?.meta_description ?? site.tagline ?? null,
    email: site.contact?.email_primary ?? null,
    telephone: site.contact?.phone_primary ?? null,
    address: Object.keys(address).length > 1 ? address : null,
    sameAs: (Array.isArray(social) ? social : []).map((account) => account?.url).filter(Boolean),
  });
}

/**
 * `WebSite` — site-wide, and what a sitelinks search box is built from.
 *
 * The `SearchAction` names the catalogue's own query parameter, so it only
 * claims something the site can actually do.
 */
export function webSiteJsonLd(site, { siteUrl } = {}) {
  const url = absoluteUrl(siteUrl, "/");
  if (!url || !site?.name) return null;

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${url}products?search={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * `Product`, with `AggregateRating` and an offer.
 *
 * Two things that are easy to get wrong and are penalised rather than ignored:
 *
 *   * **`aggregateRating` is omitted entirely at zero reviews.** A rating of 0
 *     out of 5 is not "unrated", it is the worst possible score, and every
 *     product in this catalogue is at zero today. Google flags a review count
 *     of 0 as invalid structured data.
 *   * **`AggregateOffer`, not `Offer`.** A product has several pack sizes at
 *     different prices; a single `Offer` would have to pick one and claim it is
 *     the price, and a price in structured data that does not match the page is
 *     a manual action rather than a warning.
 */
export function productJsonLd(product, { siteUrl, siteName } = {}) {
  if (!product?.slug || !product?.name) return null;

  const url = absoluteUrl(siteUrl, `/products/${product.slug}`);
  if (!url) return null;

  // `Number(null)` is 0 and `Number("")` is 0, so a pack with no price would
  // otherwise pass an isFinite check and advertise the tea as free. The value
  // has to be *present* before it is worth coercing.
  const priceOf = (pack) => {
    if (pack?.price === null || pack?.price === undefined || pack?.price === "") return null;
    const value = Number(pack.price);
    return Number.isFinite(value) && value > 0 ? value : null;
  };

  const packs = (Array.isArray(product.pack_sizes) ? product.pack_sizes : []).filter(
    (pack) => priceOf(pack) !== null && pack?.is_available !== false,
  );
  const prices = packs.map(priceOf);
  const count = Number(product.rating_count) || 0;

  const offers = prices.length
    ? compact({
        "@type": prices.length > 1 ? "AggregateOffer" : "Offer",
        priceCurrency: "BDT",
        ...(prices.length > 1
          ? {
              lowPrice: Math.min(...prices),
              highPrice: Math.max(...prices),
              offerCount: prices.length,
            }
          : { price: prices[0] }),
        availability: "https://schema.org/InStock",
        url,
      })
    : null;

  return compact({
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url,
    sku: packs[0]?.sku ?? null,
    description: product.meta_description ?? product.short_description ?? null,
    image: product.image?.url ? [product.image.url] : [],
    category: product.category?.name ?? null,
    brand: siteName ? { "@type": "Brand", name: siteName } : null,
    offers,
    aggregateRating:
      count > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: Number(product.rating_average),
            reviewCount: count,
            bestRating: 5,
            worstRating: 1,
          }
        : null,
  });
}

/**
 * `BreadcrumbList`, from the trail a page already draws.
 *
 * Taking the visible trail rather than deriving one from the URL is what keeps
 * the two in step: a crumb reading "Classic Black" where the path segment is a
 * slug is the point of having names at all.
 */
export function breadcrumbJsonLd(trail, { siteUrl } = {}) {
  const items = (Array.isArray(trail) ? trail : []).filter((crumb) => crumb?.label);
  if (items.length < 2) return null;

  const elements = items.map((crumb, index) =>
    compact({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.label,
      item: crumb.to ? absoluteUrl(siteUrl, crumb.to) : null,
    }),
  );

  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: elements };
}

/**
 * Serialise a block for a `<script type="application/ld+json">`.
 *
 * `<` is escaped because a `</script>` inside any string — a product name, a
 * review, an address — would close the tag early and spill the rest of the
 * JSON into the document as markup.
 */
export const serializeJsonLd = (data) =>
  data ? JSON.stringify(data).replace(/</g, "\\u003c") : null;
