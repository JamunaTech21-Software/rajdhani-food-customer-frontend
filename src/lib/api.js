import { createApiClient } from "@shared/api/client.js";

import { API_BASE_URL } from "../config.js";
import { useAuthStore } from "../stores/authStore.js";
import { toSession } from "./session.js";

/**
 * The customer site's API client.
 *
 * A customer session is optional — the whole catalogue, every form and all the
 * content work signed out, so nothing here may treat an anonymous visitor as an
 * error. What it does have to do is *keep* a session that exists.
 *
 * `refreshSession` is what makes RTPP-68's third criterion true. The access
 * token lives in memory only and dies with the tab; the refresh cookie is
 * HttpOnly and survives. The shared client calls this once on a 401 and retries
 * the original request, and it is single-flight there, so a page firing six
 * queries at once sends one refresh rather than six — six would rotate the token
 * family repeatedly and trip the API's own reuse detection (§7.1).
 *
 * Returning `null` rather than throwing on failure is deliberate: a failed
 * refresh is the normal state of a visitor who has never signed in, and the
 * client reads it as "no session" rather than as a broken request.
 */
async function refreshSession() {
  try {
    const session = toSession(await api.post("/auth/customer/refresh", undefined, { auth: false }));
    if (!session) return null;

    useAuthStore.getState().setSession(session);
    return session.accessToken;
  } catch {
    useAuthStore.getState().clear();
    return null;
  }
}

export const api = createApiClient({
  baseUrl: API_BASE_URL,
  getAccessToken: () => useAuthStore.getState().accessToken,
  refreshSession,
  onAuthFailure: () => useAuthStore.getState().clear(),
});

/** Public endpoints, called without a token even when one exists. */
export const publicApi = {
  get: (path, options) => api.get(path, { ...options, auth: false }),
  list: (path, options) => api.list(path, { ...options, auth: false }),
  post: (path, body, options) => api.post(path, body, { ...options, auth: false }),
};

/**
 * Endpoints that need the customer's token: their reviews, their profile.
 *
 * Separate from `publicApi` so a call cannot be written without saying which it
 * is — the two differ only in a flag, and the wrong one fails quietly by
 * returning someone else's view rather than loudly.
 */
export const accountApi = {
  get: (path, options) => api.get(path, options),
  list: (path, options) => api.list(path, options),
  patch: (path, body, options) => api.patch(path, body, options),
  delete: (path, options) => api.delete(path, options),
};
