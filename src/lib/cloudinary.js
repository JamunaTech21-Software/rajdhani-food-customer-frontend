/**
 * Cloudinary delivery URLs (§12, §1578).
 *
 * There is no `next/image` here — §19 deviation 2 replaced the Next.js scaffold
 * with Vite, so format negotiation, responsive variants and lazy loading are
 * ours to build. This module is the URL half: pure string work, no React, so it
 * can be tested directly.
 *
 * **Non-Cloudinary URLs pass through untouched.** The seeded data currently
 * serves `placehold.co` links, and an external URL with `f_auto,q_auto,w_800`
 * spliced into it is simply a broken URL. Anything this module does not
 * recognise is returned exactly as given.
 */

// .../<cloud>/image/upload/<optional transformations>/<optional vN>/<public id>
const UPLOAD = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/(?:image|video|raw)\/upload)\/(.*)$/;

/** Transformation segments Cloudinary understands, used to spot an existing one. */
const TRANSFORM_SEGMENT = /^[a-z]{1,3}_[^/]+(?:,[a-z]{1,3}_[^/]+)*$/;

export const isCloudinaryUrl = (url) => UPLOAD.test(String(url ?? ""));

/**
 * The widths served in a `srcSet`, from §1533's breakpoints (360, 768, 1024,
 * 1440, 1920) plus the 2× variants a dense display asks for.
 *
 * Deliberately not every 100px: each entry is a separate derived asset
 * Cloudinary generates and caches, so a long list costs transformations and
 * buys almost nothing — a browser picks the next size up regardless.
 */
export const DEFAULT_WIDTHS = [360, 768, 1024, 1440, 1920];

/**
 * Add `f_auto,q_auto` and an optional width to a Cloudinary URL.
 *
 * `f_auto` is what makes the WebP requirement true without asking the browser
 * anything: Cloudinary negotiates from the `Accept` header and serves AVIF or
 * WebP where supported, the original format where not.
 *
 * An existing transformation segment is preserved and ours is prepended, so a
 * caller that has already asked for a crop keeps it.
 */
export function cloudinaryUrl(url, { width, extra } = {}) {
  const source = String(url ?? "");
  const match = source.match(UPLOAD);
  if (!match) return url ?? null;

  const [, base, rest] = match;

  const parts = ["f_auto", "q_auto"];
  if (width) parts.push(`w_${Math.round(width)}`);
  if (extra) parts.push(extra);

  // Never apply our transformation twice — a re-run over an already-built URL
  // would produce .../upload/f_auto,q_auto/f_auto,q_auto,w_800/...
  const [first, ...tail] = rest.split("/");
  const alreadyOurs = first?.includes("f_auto");
  const hasTransform = TRANSFORM_SEGMENT.test(first ?? "") && !/^v\d+$/.test(first ?? "");

  if (alreadyOurs) return `${base}/${parts.join(",")}/${tail.join("/")}`;
  if (hasTransform) return `${base}/${parts.join(",")}/${first}/${tail.join("/")}`;

  return `${base}/${parts.join(",")}/${rest}`;
}

/**
 * A `srcSet` string, or null when there is nothing useful to build one from.
 *
 * Null rather than a single-entry set: a `srcSet` naming one width tells the
 * browser that is the only option, which is worse than omitting the attribute
 * and letting `src` stand.
 */
export function srcSet(url, widths = DEFAULT_WIDTHS) {
  if (!isCloudinaryUrl(url) || widths.length === 0) return null;

  return widths
    .map((width) => `${cloudinaryUrl(url, { width })} ${width}w`)
    .join(", ");
}

/**
 * `sizes` — how wide this image will actually be drawn.
 *
 * `sizes` is how the browser chooses from `srcSet` **before layout happens**, so
 * it is a promise the CSS has to keep. Get it wrong high and every visitor pays
 * for pixels they never see; get it wrong low and the image is upscaled and
 * soft. Neither failure shows up anywhere — no warning, no error, just a slower
 * or blurrier page.
 *
 * The values below are therefore *derived* from the grids they serve rather
 * than estimated. Two things the old hand-written strings missed, both of which
 * cost real bandwidth on every page:
 *
 *   * **The container caps at 1280.** `25vw` on a 1920 screen asks for 480px to
 *     fill 293px — 64% over — because a quarter of the viewport stopped being a
 *     quarter of the content the moment the content stopped growing.
 *   * **One string cannot serve four grids.** The catalogue is 3-up at 1024 and
 *     4-up above 1280; related products go straight to 4-up; news is 3-up with a
 *     wider gap; the gallery is a 2-up masonry on a phone. They had all been
 *     given the same `sizes`, so at least one was always wrong.
 */

/**
 * The site container's max width, in pixels — the same number as
 * `--container-max` in tokens.css, which is what the components read.
 *
 * Deliberately not quoting the utility classes here: Tailwind scans this file
 * and would compile any class named in a comment. See index.css.
 */
export const CONTAINER_MAX = 1280;

/** The long-form column: `mx-auto max-w-3xl px-4 sm:px-6`, on the article page. */
export const ARTICLE_MAX = 768;

/**
 * The page gutter: 16px a side below 640, 24px at and above it.
 *
 * Since Phase R7 the components read `--gutter-l` / `--gutter-r`, which are
 * `max(that, env(safe-area-inset-*))`. On a notched phone held sideways the
 * inset wins and the real content is up to 56px narrower than this assumes —
 * about 9% on a 640px screen, inside G5's tolerance, and in the safe direction
 * of asking for slightly more image than is drawn.
 */
const gutter = (viewport) => (viewport >= 640 ? 48 : 32);

/**
 * The width one column actually renders at, in CSS pixels.
 *
 * Exported because it is the only honest way to check a `sizes` value: the test
 * computes what the layout does and compares. A `sizes` string asserted against
 * itself proves nothing.
 *
 * A step may carry its own `gap` — the product page tightens from `gap-14` to
 * `gap-8` at 768, and one number for the whole ramp would be wrong either side
 * of that.
 *
 * @param {Array<{from: number, columns: number, gap?: number}>} ramp ascending by `from`
 */
export function renderedWidth(ramp, viewport, { gap = 0, container = CONTAINER_MAX } = {}) {
  const step = [...ramp].reverse().find((entry) => viewport >= entry.from) ?? ramp[0];
  const content = Math.min(viewport, container) - gutter(viewport);
  const between = step.gap ?? gap;

  return (content - between * (step.columns - 1)) / step.columns;
}

/**
 * A `sizes` string for one column of a grid inside a capped container.
 *
 * Widest condition first, because the browser takes the first match. Above the
 * container's own max width the answer is a **constant** — the content has
 * stopped growing, so the column has too, and a `vw` unit there is simply a
 * lie that gets more expensive the wider the screen.
 */
export function gridSizes(ramp, { gap = 0, container = CONTAINER_MAX } = {}) {
  // The column count changes at the ramp's own breakpoints; the gutter changes
  // at 640 (`px-4` to `px-6`). Both move the answer, so both are boundaries —
  // a ramp step that straddles 640 would otherwise be 16px out for half its
  // range, which is small but is exactly the kind of drift this file exists to
  // stop accumulating.
  const boundaries = [...new Set([0, 640, ...ramp.map((step) => step.from)])]
    .filter((width) => width < container)
    .sort((a, b) => b - a);

  // Above the container's own max width the answer is a **constant**: the
  // content has stopped growing, so the column has too, and a `vw` unit there
  // is a lie that gets more expensive the wider the screen.
  const conditions = [
    `(min-width: ${container}px) ${Math.round(renderedWidth(ramp, container, { gap, container }))}px`,
  ];

  for (const from of boundaries) {
    const step = [...ramp].reverse().find((entry) => from >= entry.from) ?? ramp[0];
    const { columns } = step;
    const deductions = gutter(from) + (step.gap ?? gap) * (columns - 1);
    const width =
      columns === 1
        ? `calc(100vw - ${deductions}px)`
        : `calc((100vw - ${deductions}px) / ${columns})`;

    conditions.push(from > 0 ? `(min-width: ${from}px) ${width}` : width);
  }

  return conditions.join(", ");
}

// ── The grids, as they are actually written in the JSX ────────────────────
// Each is checked against its own class list by tests/responsive.test.mjs, so a
// grid that changes ramp without its `sizes` following fails the suite.

/** `ProductsPage` — `grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4`. */
const PRODUCT_GRID = [
  { from: 0, columns: 1 },
  { from: 640, columns: 2 },
  { from: 768, columns: 3 },
  { from: 1280, columns: 4 },
];

/** `ProductDetailPage` related — `grid gap-5 sm:grid-cols-2 lg:grid-cols-4`. */
const RELATED_GRID = [
  { from: 0, columns: 1 },
  { from: 640, columns: 2 },
  { from: 1024, columns: 4 },
];

/** `NewsPage` and `LatestNews` — `grid gap-6 md:grid-cols-2 lg:grid-cols-3`. */
const NEWS_GRID = [
  { from: 0, columns: 1 },
  { from: 768, columns: 2 },
  { from: 1024, columns: 3 },
];

/** `GalleryGrid` — `columns-1 gap-4 min-[360px]:columns-2 md:columns-3 xl:columns-4`. */
const GALLERY_GRID = [
  { from: 0, columns: 1 },
  { from: 360, columns: 2 },
  { from: 768, columns: 3 },
  { from: 1280, columns: 4 },
];

/** The half-and-half sections — `grid gap-10 lg:grid-cols-2 lg:gap-14`. */
const SPLIT_GRID = [
  { from: 0, columns: 1 },
  { from: 1024, columns: 2 },
];

/**
 * `ProductDetailPage` — `grid gap-10 md:grid-cols-2 md:gap-8 lg:gap-14`.
 *
 * Splits a breakpoint earlier than the other half-and-half sections, and with a
 * tighter gap in between, because a tablet showing a 720px square image above
 * the price puts the price below the fold on the one page whose job is to show
 * it.
 */
const PRODUCT_MEDIA_GRID = [
  { from: 0, columns: 1 },
  { from: 768, columns: 2, gap: 32 },
  { from: 1024, columns: 2, gap: 56 },
];

/**
 * `BulkSupplyCta` — `grid gap-8 md:grid-cols-[1fr_1.2fr]`.
 *
 * The image takes the wider track: 1.2 of 2.2, so 0.545 of what is left after
 * the gap. Not a column count, so it cannot come from `gridSizes` — but it was
 * being given `SIZES.half`, which promises the *full* width below 1024 and was
 * therefore 92% over at 768.
 */
const BULK_CTA_SIZES = [
  "(min-width: 1280px) 654px",
  "(min-width: 768px) calc((100vw - 80px) * 0.545)",
  "(min-width: 640px) calc(100vw - 48px)",
  "calc(100vw - 32px)",
].join(", ");

/**
 * `LatestNews`, once it is two thirds of `VoicesBand`'s row.
 *
 * Identical to `newsCard` below `xl`, where the band is still full width and
 * still `md:grid-cols-2 lg:grid-cols-3`. **Only the top step differs**, and by
 * a lot: from 1280 the container caps, the news track is a constant
 * `(1232 - 40) × 2/3 = 795px`, and each of the three cards is
 * `(795 - 48) / 3 = 249px` — where the news *page* draws the same card at
 * 395px. Sharing one `sizes` between them would have been 59% over on the home
 * page, which is an image and a half of wasted bandwidth on the busiest route.
 *
 * Not from `gridSizes`, for the same reason `BULK_CTA_SIZES` is not: a
 * fractional track is not a column count.
 */
const HOME_NEWS_SIZES = [
  "(min-width: 1280px) 249px",
  "(min-width: 1024px) calc((100vw - 96px) / 3)",
  "(min-width: 768px) calc((100vw - 72px) / 2)",
  "(min-width: 640px) calc(100vw - 48px)",
  "calc(100vw - 32px)",
].join(", ");

export const SIZES = {
  /** Full-bleed: heroes and page banners, which ignore the container. */
  full: "100vw",

  /** One column of the site container. */
  content: gridSizes([{ from: 0, columns: 1 }]),

  /** The article column, which caps at 768 rather than 1280. */
  article: gridSizes([{ from: 0, columns: 1 }], { container: ARTICLE_MAX }),

  productCard: gridSizes(PRODUCT_GRID, { gap: 20 }),
  relatedCard: gridSizes(RELATED_GRID, { gap: 20 }),
  newsCard: gridSizes(NEWS_GRID, { gap: 24 }),

  /** The same card on the home page, where it sits in a narrower track. */
  homeNewsCard: HOME_NEWS_SIZES,
  galleryTile: gridSizes(GALLERY_GRID, { gap: 16 }),

  /**
   * `FeaturedProducts` — a horizontal scroll strip.
   *
   * Two steps, because the row changes shape once the arrows appear:
   *
   *   * **From 1280** the container caps at 1232, the two 44px arrows and
   *     their two 12px gaps come out of it, and the remaining 1120 is divided
   *     into six tracks with five 20px gaps: `(1120 - 100) / 6 = 170`.
   *   * **From 640 to 1279** the arrows are hidden and the tracks are a fixed
   *     15rem, overflowing on purpose — so 240px however wide the screen gets.
   *   * **Below 640** they narrow to 10rem. A 240px card on a 390px phone
   *     shows one and a half of them; the mobile reference shows three and a
   *     half, and a strip that does not visibly continue is a strip nobody
   *     scrolls. A `vw` unit at either step would describe the viewport
   *     rather than the card.
   *
   * The one case this overstates is a catalogue with so few featured products
   * that the tracks stop overflowing and stretch. Eight are published, which
   * overflows at every width, so it is right today and wrong only on a
   * catalogue that has nearly emptied.
   */
  carouselCard: "(min-width: 1280px) 170px, (min-width: 640px) 240px, 84px",

  /** Half a split section: the welcome block and the page blocks. */
  half: gridSizes(SPLIT_GRID, { gap: 56 }),

  /** The product page's main image, which splits a breakpoint earlier. */
  productMedia: gridSizes(PRODUCT_MEDIA_GRID),

  /** The wider track of the bulk-supply band. */
  splitWide: BULK_CTA_SIZES,

  /**
   * One card of a process timeline.
   *
   * A wrapping flex row rather than a column grid, so `gridSizes` does not
   * model it: five across once the row stops wrapping, and roughly two at
   * phone width where each card holds its 10rem minimum.
   */
  processStep: "(min-width: 1280px) 227px, (min-width: 768px) calc((100vw - 144px) / 5), 160px",


  /**
   * The zoomed product image: a square dialog capped at 56rem, and capped
   * again by the viewport height, which `sizes` has no way to express. The
   * width condition is the honest half — it was being given `SIZES.content`,
   * which promises the whole 1232px container.
   */
  zoom: "(min-width: 928px) 896px, calc(100vw - 32px)",

  /**
   * The lightbox image. Not in the container at all — a fixed dialog with
   * `p-4 sm:p-8` around a `max-w-5xl` (1024px) column.
   */
  lightbox: "(min-width: 1088px) 1024px, (min-width: 640px) calc(100vw - 64px), calc(100vw - 32px)",

  /** Logos, gallery strip thumbs and certification marks — none above 48px. */
  thumbnail: "96px",
};
