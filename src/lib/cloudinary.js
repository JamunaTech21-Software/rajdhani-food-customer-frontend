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
 * A `sizes` value from a layout description.
 *
 * `sizes` is how the browser chooses from `srcSet` *before* layout, so a wrong
 * value silently downloads the wrong variant. These are the shapes this site
 * actually uses rather than a general-purpose builder.
 */
export const SIZES = {
  full: "100vw",
  // Content column capped at 1280px, full-bleed below that.
  content: "(min-width: 1280px) 1280px, 100vw",
  // Four-up product grid at desktop, two-up at tablet, one-up on a phone.
  card: "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw",
  // The detail page's main image sits in a half-width column.
  half: "(min-width: 1024px) 50vw, 100vw",
  thumbnail: "96px",
};
