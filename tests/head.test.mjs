import assert from "node:assert/strict";
import { test } from "node:test";

/**
 * The head helpers, exercised rather than read (§14.3, RTPP-71).
 *
 * `tests/seo.test.mjs` asserts that `lib/head.js` *says* it updates in place.
 * This asserts that it *does* — the claim that matters is behavioural, and the
 * failure it guards against (a second `<title>`, which a browser ignores in
 * favour of the first) is invisible on screen.
 *
 * A twenty-line fake rather than jsdom: the module touches five DOM methods,
 * and §18's no-new-dependencies rule is not worth breaking for the other
 * thousand.
 */
function fakeDocument() {
  const children = [];

  const element = (tag) => ({
    tag,
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    remove() {
      const at = children.indexOf(this);
      if (at >= 0) children.splice(at, 1);
    },
  });

  // Enough of a selector engine for the shapes this module uses:
  // `tag[attr="value"]` and `tag[attr]`, any number of attribute clauses.
  const matches = (node, selector) => {
    const [, tag, rest = ""] = selector.match(/^([a-z]+)((?:\[[^\]]+\])*)$/) ?? [];
    if (!tag || node.tag !== tag) return false;

    for (const [, name, value] of rest.matchAll(/\[([^\]=]+)(?:="([^"]*)")?\]/g)) {
      if (!(name in node.attributes)) return false;
      if (value !== undefined && node.attributes[name] !== value) return false;
    }
    return true;
  };

  return {
    children,
    createElement: element,
    head: {
      append: (node) => children.push(node),
      querySelector: (selector) => children.find((node) => matches(node, selector)) ?? null,
    },
  };
}

globalThis.document = fakeDocument();
const { MANAGED, removeManagedTag, upsertHeadTag } = await import("../src/lib/head.js");

test("a second call updates the tag instead of adding another", () => {
  // The whole design. React 19's metadata hoisting appends, and a browser uses
  // the *first* title in the document — so with RTPP-73's shell renderer
  // having already written a head, an appended tag is simply ignored.
  const selector = 'meta[name="description"]';

  upsertHeadTag(selector, { tag: "meta", name: "description", content: "First" });
  upsertHeadTag(selector, { tag: "meta", name: "description", content: "Second" });

  const found = document.children.filter((node) => node.attributes.name === "description");

  assert.equal(found.length, 1, "one description, not two");
  assert.equal(found[0].attributes.content, "Second");
});

test("a created tag is marked as ours", () => {
  upsertHeadTag('link[rel="canonical"]', { tag: "link", rel: "canonical", href: "https://x/" });

  const canonical = document.head.querySelector('link[rel="canonical"]');
  assert.equal(canonical.attributes[MANAGED], "meta");
});

test("a tag the app did not create is left alone", () => {
  // The CSP meta, the stylesheet and the preloads share this head. Removing one
  // because it matched a selector is what the marker attribute prevents.
  const theirs = document.createElement("meta");
  theirs.setAttribute("name", "robots");
  theirs.setAttribute("content", "index");
  document.head.append(theirs);

  removeManagedTag('meta[name="robots"]');

  assert.equal(document.head.querySelector('meta[name="robots"]'), theirs);
});

test("a tag the app did create is removed", () => {
  // Navigating off /account has to take the noindex with it — a stale one
  // carried onto the catalogue would quietly drop the catalogue from search,
  // and nothing on screen would look any different.
  upsertHeadTag('meta[name="robots"][data-rajdhani-seo]', {
    tag: "meta",
    name: "robots",
    content: "noindex, follow",
  });

  removeManagedTag('meta[name="robots"]');

  assert.equal(
    document.children.filter((n) => n.attributes.name === "robots" && n.attributes[MANAGED]).length,
    0,
  );
});
