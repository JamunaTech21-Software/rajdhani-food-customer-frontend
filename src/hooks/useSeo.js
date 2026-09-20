import { useEffect } from "react";
import { useLocation } from "react-router";

import { SITE_URL } from "../config.js";
import { removeManagedTag, upsertHeadTag } from "../lib/head.js";
import { resolveMeta } from "../lib/seo.js";
import { useSiteStore } from "../stores/siteStore.js";

/**
 * The head for the current route (§14.3).
 *
 * **A hook rather than a component, because most pages return early.** Nearly
 * every page here renders a skeleton while its query is pending and an error
 * panel if it fails; a `<Seo>` element placed in the success branch would leave
 * both of those states showing the *previous* route's title — which is the
 * state a crawler on a slow connection is most likely to see. A hook runs on
 * every render of the page regardless of which branch returns.
 *
 * **Not `react-helmet-async`, which the ticket names**: it is unmaintained and
 * not React 19-compatible. **Not React 19's own metadata hoisting either**: it
 * appends, and `lib/head.js` explains why appending is the wrong operation
 * here. §14.3 describes this arrangement exactly — the shell writes the head,
 * "the React app then hydrates over the top and manages meta from that point
 * on", and updating in place is what "over the top" has to mean.
 *
 * Call it once per page, at the top with the other hooks. Values may be
 * `undefined` on the first pass and fill in when the query lands; the effect
 * re-runs and the head follows.
 *
 * Everything unset falls through `seo_meta` and then `site_profile`. Those
 * fallbacks matter more than the overrides: almost every `meta_title` in the
 * database is null today, so the site-level pair is what actually ships.
 */
export function useSeo({
  title,
  description,
  image,
  path,
  absoluteTitle = false,
  noindex = false,
} = {}) {
  const site = useSiteStore((s) => s.site);
  const { pathname } = useLocation();

  // The canonical is the current path unless a page overrides it, and it is
  // deliberately the *pathname* — `/products?search=darjeeling` and
  // `/products?sort=price_asc` are the same products rearranged, and
  // canonicalising each combination separately is how a catalogue of ninety
  // products ends up indexed as a few thousand near-duplicates. A page that
  // genuinely is distinct — a category, page three — passes its own `path`.
  const meta = resolveMeta({
    title,
    description,
    image,
    path: path ?? pathname,
    site,
    siteUrl: SITE_URL,
    absoluteTitle,
  });

  // Not a layout effect: nothing on screen depends on the head, and a crawler
  // that runs JavaScript reads the DOM once it settles either way.
  useEffect(() => {
    document.title = meta.title;

    // Open Graph and Twitter are maintained as the customer navigates — the
    // second scope line. A shared link is the entire reason these exist, and a
    // stale `og:title` from the previous route is the failure mode.
    const tags = [
      ['meta[name="description"]', { tag: "meta", name: "description", content: meta.description }],
      ['link[rel="canonical"]', { tag: "link", rel: "canonical", href: meta.canonical }],
      ['meta[property="og:type"]', { tag: "meta", property: "og:type", content: "website" }],
      ['meta[property="og:site_name"]', { tag: "meta", property: "og:site_name", content: meta.siteName }],
      ['meta[property="og:title"]', { tag: "meta", property: "og:title", content: meta.title }],
      ['meta[property="og:description"]', { tag: "meta", property: "og:description", content: meta.description }],
      ['meta[property="og:url"]', { tag: "meta", property: "og:url", content: meta.canonical }],
      ['meta[property="og:image"]', { tag: "meta", property: "og:image", content: meta.image }],
      ['meta[name="twitter:card"]', { tag: "meta", name: "twitter:card", content: meta.image ? "summary_large_image" : "summary" }],
      ['meta[name="twitter:title"]', { tag: "meta", name: "twitter:title", content: meta.title }],
      ['meta[name="twitter:description"]', { tag: "meta", name: "twitter:description", content: meta.description }],
      ['meta[name="twitter:image"]', { tag: "meta", name: "twitter:image", content: meta.image }],
    ];

    for (const [selector, attributes] of tags) {
      // An empty value is skipped rather than written: `<meta property="og:image"
      // content="">` tells a crawler there is an image and then hands it
      // nothing, which is worse than the tag being absent.
      if (attributes.content || attributes.href) upsertHeadTag(selector, attributes);
    }

    // Keep the account and wishlist pages out of the index. `follow` rather
    // than `nofollow`, so the links out of them still count. Removed again on
    // every other route rather than left behind — a stale `noindex` carried
    // from `/account` onto the catalogue would quietly take the catalogue out
    // of search, and nothing on screen would look any different.
    if (noindex) {
      upsertHeadTag('meta[name="robots"]', { tag: "meta", name: "robots", content: "noindex, follow" });
    } else {
      removeManagedTag('meta[name="robots"]');
    }
  }, [meta.title, meta.description, meta.canonical, meta.image, meta.siteName, noindex]);
}
