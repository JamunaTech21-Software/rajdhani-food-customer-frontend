import { createApiClient } from "@shared/api/client.js";

import { API_BASE_URL } from "../config.js";

/**
 * The customer site's API client.
 *
 * **Every call is anonymous.** The site has no sign-in: the catalogue, the
 * content, the enquiry and dealer forms and the review lists are all public,
 * and there is nothing a visitor can do here that needs to be attributed to
 * them. So there is no token to send, nothing to refresh and no 401 to
 * recover from.
 *
 * It used to carry the other half — `refreshSession` exchanging the HttpOnly
 * cookie for an access token on a 401, and an `accountApi` whose calls went
 * out with it, for the customer's profile and their own review. Those went
 * with the account feature; the shared client still supports both, so
 * restoring them is wiring this file back up rather than rebuilding anything.
 *
 * `publicApi` is kept as the name every caller already uses, and it stays
 * explicit rather than collapsing into `api`: a call site that says "public"
 * is one nobody has to check.
 */
export const api = createApiClient({ baseUrl: API_BASE_URL });

/** Public endpoints — which, on this site, is all of them. */
export const publicApi = {
  get: (path, options) => api.get(path, { ...options, auth: false }),
  list: (path, options) => api.list(path, { ...options, auth: false }),
  post: (path, body, options) => api.post(path, body, { ...options, auth: false }),
};
