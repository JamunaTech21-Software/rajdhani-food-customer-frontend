import { useQuery } from "@tanstack/react-query";

import { publicApi } from "../lib/api.js";

/**
 * The product categories, for the Products dropdown and the listing filter bar.
 *
 * **A second request, and RTPP-58 asked for one.** The scope says "everything
 * sourced from `GET /public/layout` in one request", but that payload carries
 * only `site`, `menus`, `social` and `newsletter` — categories are not in it,
 * and `GET /public/categories` is a separate endpoint. The dropdown cannot be
 * "driven by Category" without asking for categories.
 *
 * Between the two, the acceptance criterion wins: adding a category in admin has
 * to put it in the dropdown. Raised with the backend — if `/public/layout` grew
 * a `categories` array the second request would go away and both requirements
 * would hold at once.
 *
 * Cached for five minutes: the header asks on every page, and the answer changes
 * when an editor adds a category, not when a visitor clicks a link.
 */
export function useCategories() {
  return useQuery({
    queryKey: ["public", "categories"],
    queryFn: () => publicApi.get("/public/categories"),
    staleTime: 5 * 60_000,
    // The header must render without them — an empty dropdown is a degraded
    // menu, not a broken page.
    retry: 1,
  });
}
