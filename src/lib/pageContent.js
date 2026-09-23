/**
 * The static content pages: About, Quality, Privacy and Terms (§10.4).
 *
 * All four are built from `PageBlock` rows keyed `(page_key, block_key)`, which
 * is what makes every section of them editable from the admin Page Content
 * screen — the ticket's first acceptance criterion. Nothing here knows any
 * copy; it knows which keys to look for and how to render what comes back.
 *
 * The page keys are the backend's own. `SeoMetaSeeder` and `NavigationSeeder`
 * both spell them `about`, `quality`, `privacy` and `terms`, and the live
 * `legal` menu links `/privacy` and `/terms` — so those are the routes, not the
 * `/privacy-policy` and `/terms-conditions` the ticket text guesses at. A route
 * the site's own footer does not link to is a page nobody reaches.
 */

export const PAGE_KEYS = {
  about: "about",
  // The gallery is not a page of blocks like the other four — it is its images
  // — but its comp closes on a strip of copy, and that copy has to come from
  // somewhere an editor can reach. The key is accepted: `page_key` is a free
  // string on the API, and `/public/page-blocks/gallery` answers 200 with an
  // empty list rather than 404.
  gallery: "gallery",
  quality: "quality",
  privacy: "privacy",
  terms: "terms",
};

/** One block out of a page's list, by its `block_key`. */
export function blockFor(blocks, key) {
  if (!Array.isArray(blocks)) return null;
  return blocks.find((block) => block?.block_key === key) ?? null;
}

/**
 * A block's bullet list, always an array.
 *
 * The admin schema types it `[array, 'null']` while `/public/home`'s welcome
 * block always sends an array. Both are accommodated rather than each caller
 * carrying its own `?? []`.
 */
export function bulletsOf(block) {
  const points = block?.bullet_points;
  return Array.isArray(points) ? points.filter((point) => typeof point === "string" && point.trim()) : [];
}

// ── Anchor links in long rich text ────────────────────────────────────────

const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };

/** The visible text of a heading: inner markup and entities removed. */
export function headingText(html) {
  return String(html ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A heading's fragment id.
 *
 * Latin letters, digits and hyphens only: a Bengali heading would otherwise
 * produce an id that has to be percent-encoded to appear in an href, and a
 * link nobody can read or type is not much of an anchor. Such a heading falls
 * back to its position, which at least works.
 */
export function headingSlug(text, index = 0) {
  const slug = String(text ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "");

  return slug || `section-${index + 1}`;
}

const HEADING = /<(h2|h3)\b([^>]*)>([\s\S]*?)<\/\1>/gi;

/**
 * Sanitised rich text with an id on every heading, plus the list of them.
 *
 * The second acceptance criterion asks for anchor links on the legal pages, and
 * a privacy policy is the one page on the site somebody arrives at pointed
 * directly at a clause. The ids have to be derived from the text rather than
 * stored, because an editor writing in TipTap has no way to set one — and they
 * have to be stable, or a link shared last month lands in the wrong place.
 *
 * A string transform rather than DOM work: the same function then runs in a
 * test, and the input is already sanitised server-side (`RichText::sanitize()`),
 * so there is nothing here that a DOM parser would be protecting against.
 */
export function withAnchors(html) {
  const source = String(html ?? "");
  if (!source) return { html: "", headings: [] };

  const headings = [];
  const taken = new Set();

  const out = source.replace(HEADING, (match, tag, attributes, inner) => {
    const text = headingText(inner);
    if (!text) return match;

    // An id an editor somehow set already wins: it is what any existing link
    // points at, and replacing it would break those links silently.
    const existing = /\bid\s*=\s*["']([^"']+)["']/i.exec(attributes);

    let id = existing?.[1] ?? headingSlug(text, headings.length);
    if (!existing) {
      let suffix = 2;
      // Two sections legitimately called "Your Rights" would otherwise share an
      // id, and the second would be unreachable.
      while (taken.has(id)) id = `${headingSlug(text, headings.length)}-${suffix++}`;
    }

    taken.add(id);
    headings.push({ id, text, level: tag.toLowerCase() === "h2" ? 2 : 3 });

    return existing ? match : `<${tag}${attributes} id="${id}">${inner}</${tag}>`;
  });

  return { html: out, headings };
}

const escapeHtml = (text) =>
  String(text).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);

/**
 * A legal page's blocks as one document.
 *
 * A privacy policy is one continuous text, but an editor may have split it
 * across several blocks — and which keys they chose is not something this page
 * can know. So every published block on the page is rendered, in the order the
 * API returned (its own `sort_order`), with each block's heading promoted into
 * the document as an `h2` so it joins the contents list alongside the headings
 * an editor typed inside a body.
 *
 * The bodies are already sanitised; the headings are plain text from a column,
 * so they are escaped on the way in.
 */
export function legalDocument(blocks) {
  if (!Array.isArray(blocks)) return { html: "", headings: [] };

  const html = blocks
    .filter(Boolean)
    .map((block) => {
      const heading = block.heading ? `<h2>${escapeHtml(block.heading)}</h2>` : "";
      const subheading = block.subheading ? `<p>${escapeHtml(block.subheading)}</p>` : "";
      return `${heading}${subheading}${block.body ?? ""}`;
    })
    .join("\n");

  return withAnchors(html);
}

/**
 * Whether a table of contents is worth showing.
 *
 * Two headings is a list of two links above a page with two sections, which
 * costs more attention than it saves.
 */
export function showContents(headings) {
  return Array.isArray(headings) && headings.filter((h) => h.level === 2).length >= 3;
}
