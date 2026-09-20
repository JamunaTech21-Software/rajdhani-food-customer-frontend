import { useEffect } from "react";

import { MANAGED } from "../../lib/head.js";
import { serializeJsonLd } from "../../lib/seo.js";

/**
 * One structured-data block (§14.3).
 *
 * Keyed by `id` so several can coexist — `Organization` and `WebSite` from the
 * layout, `Product` and `BreadcrumbList` from a product page — and so each
 * removes only its own on the way out. A `Product` block left behind after
 * navigating to the news index would describe a page that is no longer there.
 *
 * A component rather than a hook, unlike `useSeo`, and for the opposite reason:
 * structured data describes what is actually *on* the page, so a block that is
 * absent while the page is still loading is correct rather than a gap.
 *
 * Separate scripts rather than one `@graph`, because the shell renderer emits
 * them separately and the two must not differ.
 */
export function JsonLd({ id, data }) {
  const payload = serializeJsonLd(data);

  useEffect(() => {
    const selector = `script[${MANAGED}="${id}"]`;
    document.head.querySelector(selector)?.remove();

    if (payload) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute(MANAGED, id);
      // `textContent`, not `innerHTML`: the payload is already escaped by
      // `serializeJsonLd`, and assigning it as markup would be a second, and
      // needless, parse of our own JSON.
      script.textContent = payload;
      document.head.append(script);
    }

    return () => document.head.querySelector(selector)?.remove();
  }, [id, payload]);

  return null;
}
