import { useQuery } from "@tanstack/react-query";

import { publicApi } from "../lib/api.js";

/** All 64 districts. Cached hard — they do not change. */
export function useDistricts() {
  return useQuery({
    queryKey: ["public", "districts"],
    queryFn: () => publicApi.list("/public/locations/districts"),
    staleTime: Infinity,
  });
}

/**
 * The upazilas of one district.
 *
 * **Keyed on the district id**, which is what makes RTPP-63's first criterion
 * hold under fast switching: each district's list is its own cache entry, so a
 * slow response for Bagerhat cannot arrive after Dhaka was picked and overwrite
 * it. Without the key in the query, that race shows the wrong upazilas with no
 * error anywhere.
 *
 * Disabled until a district is chosen, so the select is empty rather than
 * showing a stale list from whatever was asked for last.
 */
export function useUpazilas(districtId) {
  return useQuery({
    queryKey: ["public", "upazilas", districtId],
    queryFn: () => publicApi.list(`/public/locations/districts/${encodeURIComponent(districtId)}/upazilas`),
    enabled: Boolean(districtId),
    staleTime: Infinity,
  });
}
