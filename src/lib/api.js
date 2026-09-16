import { createApiClient } from "@shared/api/client.js";

import { API_BASE_URL } from "../config.js";
import { useAuthStore } from "../stores/authStore.js";

/**
 * The customer site's API client.
 *
 * Deliberately simpler than the dashboard's. A customer session is optional —
 * the whole catalogue, every form and all the content work signed out, and only
 * the wishlist and "my enquiries" need a token. So there is no single-flight
 * refresh dance here: a 401 means the session lapsed, and the right response is
 * to drop it and carry on rendering, not to fight for it.
 */
export const api = createApiClient({
  baseUrl: API_BASE_URL,
  getAccessToken: () => useAuthStore.getState().accessToken,
  onAuthFailure: () => useAuthStore.getState().clear(),
});

/** Public endpoints, called without a token even when one exists. */
export const publicApi = {
  get: (path, options) => api.get(path, { ...options, auth: false }),
  list: (path, options) => api.list(path, { ...options, auth: false }),
  post: (path, body, options) => api.post(path, body, { ...options, auth: false }),
};
