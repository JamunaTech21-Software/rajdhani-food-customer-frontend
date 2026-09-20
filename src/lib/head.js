/**
 * Writing to `document.head` (§14.3).
 *
 * Two callers share these: `useSeo`, which owns the route's title and meta, and
 * the `JsonLd` component, which owns one structured-data block. They live here
 * rather than beside either one so that neither has to import the other, and so
 * the marker attribute has a single definition — everything this app puts in
 * the head carries it, and nothing removes a tag that does not.
 */

/**
 * Marks a tag as ours.
 *
 * The shell renderer (RTPP-73) writes its own head server-side, and the
 * `index.html` shell carries a few tags of its own. Removing an unmarked tag —
 * a stylesheet, a preload, the CSP meta — because it matched a selector is the
 * failure this attribute exists to prevent.
 */
export const MANAGED = "data-rajdhani-seo";

/**
 * Update a head tag in place, creating it only if it is missing.
 *
 * **Updating rather than appending is the whole design.** React 19's own
 * metadata hoisting appends, and a browser uses the *first* `<title>` in the
 * document: with a title already in the HTML, an appended one is ignored and
 * navigating would appear to change nothing. Two descriptions and two
 * canonicals are no better — a crawler should not have to choose.
 */
export function upsertHeadTag(selector, { tag, ...attributes }) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement(tag);
    element.setAttribute(MANAGED, "meta");
    document.head.append(element);
  }

  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }

  return element;
}

/** Remove a tag, but only one this app put there. */
export function removeManagedTag(selector) {
  document.head.querySelector(`${selector}[${MANAGED}]`)?.remove();
}
