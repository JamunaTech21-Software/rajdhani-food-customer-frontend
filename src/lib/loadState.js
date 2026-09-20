/**
 * One state for a page assembled from several requests (§10.5, RTPP-72).
 *
 * The ticket's two "done when" lines pull in opposite directions, and this is
 * where they meet:
 *
 *   * *With the API stopped, every page degrades to a branded error.*
 *   * *A brand-new brand with no content yet renders every page without
 *     breaking.*
 *
 * Both end with an empty screen, and they must not look the same. "We could not
 * reach the site" shown to a new brand that simply has not written its About
 * page yet is a lie that sends someone hunting a fault that is not there; a
 * quiet "nothing here yet" shown during an outage hides the outage. The
 * difference is not in what arrived — nothing did, either way — but in *why*,
 * and only the query objects know that.
 *
 * Pure, and no `config.js` import, so the table of cases can be asserted
 * directly rather than inferred from a rendered page.
 */

/**
 * Collapse several queries into one of four states.
 *
 * `hasContent` is the caller's own answer to "is there anything worth drawing",
 * because only the page knows which of its five requests actually matter. A
 * page whose hero banner failed but whose body arrived is `ready`: the visitor
 * gets the page, not an apology for a decoration they never saw.
 *
 * A **partial** failure with nothing to show is an error rather than an empty
 * state — one request out of five failing is still an outage from where the
 * visitor is sitting, and offering them a retry is more use than telling them
 * the page is blank on purpose.
 */
export function combineState(queries = [], { hasContent = false } = {}) {
  const list = (Array.isArray(queries) ? queries : [queries]).filter(Boolean);

  // Loading wins over everything, including a failure beside it: a retry button
  // offered while another request is still in flight invites a second click
  // that cancels the first.
  if (list.some((query) => query.isPending)) return "loading";

  if (hasContent) return "ready";
  if (list.some((query) => query.isError)) return "error";

  return "empty";
}

/**
 * Retry every query that failed, and only those.
 *
 * Refetching the ones that succeeded would throw away good data on a slow
 * connection and count another view on anything that counts them — the news
 * article increments `view_count` on the request itself.
 */
export function retryFailed(queries = []) {
  for (const query of (Array.isArray(queries) ? queries : [queries]).filter(Boolean)) {
    if (query.isError) query.refetch?.();
  }
}

/**
 * What to say when a request fails.
 *
 * Three cases a visitor can act on differently, and lumping them together as
 * "something went wrong" wastes the one useful thing we know:
 *
 *   * **offline** — their connection, and no amount of retrying helps until it
 *     is back. `navigator.onLine` is only trustworthy when it says *false*.
 *   * **notFound** — the thing is gone, and a retry will fail identically.
 *   * everything else — ours, and worth retrying.
 */
export function failureKind(error, { online = true } = {}) {
  if (!online) return "offline";

  const status = Number(error?.status);
  if (status === 404) return "notFound";
  if (status === 429) return "rateLimited";
  if (status >= 500 || !Number.isFinite(status)) return "server";

  return "server";
}

/** The copy for each kind, so the wording is the same wherever it surfaces. */
export const FAILURE_COPY = {
  offline: {
    title: "You appear to be offline",
    body: "Check your connection and try again — nothing is wrong at our end.",
    retry: true,
  },
  notFound: {
    title: "We could not find that",
    body: "It may have been renamed or withdrawn.",
    retry: false,
  },
  rateLimited: {
    title: "Too many requests just now",
    body: "Please wait a moment and try again.",
    retry: true,
  },
  server: {
    title: "We could not load this",
    body: "Something went wrong at our end. The rest of the site is still available.",
    retry: true,
  },
};
