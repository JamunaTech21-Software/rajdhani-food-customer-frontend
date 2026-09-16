import { useQuery } from "@tanstack/react-query";

import { publicApi } from "../lib/api.js";

/**
 * Resolve a download by its stable key (§11, RTPP-51).
 *
 * `/public/downloads/{key}` answers with `{title, description, url}` or a 404.
 * Resolving it rather than linking straight at the path means the button can be
 * **hidden when the download does not exist** — which is the state today: no
 * download rows have been created yet, so every key 404s.
 *
 * A dead "Download Brochure" button is worse than no button: it looks like the
 * site is broken rather than like the content is not ready.
 */
export function useDownload(key) {
  return useQuery({
    queryKey: ["public", "download", key],
    queryFn: () => publicApi.get(`/public/downloads/${encodeURIComponent(key)}`),
    enabled: Boolean(key),
    // A missing download is a settled answer, not a blip — retrying a 404 three
    // times only delays hiding the button.
    retry: false,
    staleTime: 10 * 60_000,
  });
}
