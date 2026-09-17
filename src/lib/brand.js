/**
 * The brand mark, while the API still has a placeholder in it.
 *
 * `site_profile.logos.light` is the real source and stays the real source — an
 * editor uploads a logo in the dashboard and it appears here with no deploy
 * (§18.2). But the seeded row points at a `placehold.co` square reading
 * "Rajdhani", and a placeholder is not a logo: it is what the API says when
 * nobody has uploaded one yet.
 *
 * So the bundled file wins over a placeholder and loses to anything real. That
 * makes the header correct today *and* the moment the client uploads their own
 * mark under RTPP-86 — with nothing to remember to undo, which is the part a
 * hardcoded path would get wrong.
 */

/** Served from `static/`, which is the Vite public directory (see vite.config.js). */
export const BUNDLED_LOGO = "/rajdhani-logo.png";

/** Seeded placeholders, not uploads. Cloudinary is where a real one lives (§12). */
const PLACEHOLDER = /(^|\/\/)(placehold\.co|via\.placeholder\.com|placekitten\.com)\//i;

export const isPlaceholderImage = (url) => PLACEHOLDER.test(String(url ?? ""));

/**
 * What the header should draw, and the alt text to go with it.
 *
 * Always returns something: a site with no logo row at all still has a mark.
 */
export function brandLogo(logo, siteName) {
  const url = logo?.url;
  const real = url && !isPlaceholderImage(url);

  return {
    url: real ? url : BUNDLED_LOGO,
    alt: (real ? logo.alt : null) ?? siteName ?? "Rajdhani Food Products",
    /** The bundled file is a local asset, so it skips the Cloudinary pipeline. */
    isBundled: !real,
  };
}
