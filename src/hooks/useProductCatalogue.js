import { useState } from "react";

import { SITE_URL } from "../config.js";
import { publicApi } from "../lib/api.js";
import {
  CATALOGUE_COLUMNS,
  catalogueFilename,
  catalogueRows,
  fetchAllPages,
  toCsv,
} from "../lib/catalogue.js";
import { useSiteStore } from "../stores/siteStore.js";

/**
 * Hand the visitor a `.csv` of the whole catalogue.
 *
 * **On demand, not on load.** A `useQuery` here would fetch every product on
 * every visit to the home page to serve a button most visitors never press —
 * eight rows today, but this is the file that grows with the catalogue. The
 * request starts on the click.
 *
 * Lives in a hook rather than in `Hero` because a band that fetches for itself
 * is how one round trip becomes six, and because the page owns every other
 * request on it. `Hero` gets a callback and a state string.
 */
export function useProductCatalogue() {
  const [state, setState] = useState("idle");
  const siteName = useSiteStore((s) => s.site?.name);

  async function download() {
    // Guard rather than disable-and-hope: a double click while the first
    // request is in flight would otherwise build and save the file twice.
    if (state === "working") return;
    setState("working");

    try {
      const products = await fetchAllPages(({ page, limit }) =>
        publicApi.list("/public/products", { params: { page, limit } }),
      );

      const csv = toCsv(CATALOGUE_COLUMNS, catalogueRows(products, { siteUrl: SITE_URL }));
      save(csv, catalogueFilename(siteName));
      setState("idle");
    } catch {
      // Nothing is thrown on: the button is the whole feature, and a failed
      // download that says so is more use than an error boundary swallowing
      // the page around it.
      setState("failed");
    }
  }

  return { download, state };
}

/**
 * Save a string as a file.
 *
 * A Blob and an object URL, because there is no server route to link at. The
 * anchor is never in the document — a click on a detached element still
 * triggers the download, and appending it would risk a visible flash.
 *
 * `revokeObjectURL` matters: without it the Blob is held for the life of the
 * document, and a visitor who pressed the button four times has four copies of
 * the catalogue in memory.
 */
function save(text, filename) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}
