import { applyTheme } from "@shared/theme/applyTheme.js";

import { API_BASE_URL } from "../config.js";
import { useSiteStore } from "../stores/siteStore.js";
import { fetchLayout } from "./fetchLayout.js";

/**
 * Fetch the site profile as early as the browser will let us (§4.2).
 *
 * **On "before first paint".** Two of RTPP-57's requirements pull against each
 * other: the payload should arrive before first paint, *and* the app must render
 * correctly when that endpoint is slow or unavailable. Both cannot be literally
 * true — blocking paint on a network request is exactly what makes a slow
 * endpoint a blank screen.
 *
 * What resolves it is that `tokens.css` is not a set of neutral placeholders: it
 * carries the real brand values. So first paint is *already correctly branded*,
 * and the payload's job is to correct it only where an admin has since changed
 * something. There is no unstyled flash to avoid, because there is no unstyled
 * state.
 *
 * What is left is to start the request as early as possible. This module is
 * imported by `main.jsx` before `createRoot`, so the request is in flight while
 * React is still mounting — earlier than any effect, which by definition runs
 * after paint.
 *
 * A proper before-paint theme needs the value in the HTML, which is RTPP-73's
 * shell renderer, not something a client bundle can do for itself.
 */

// Long enough for a cold shared-hosting response, short enough that a hung
// connection does not leave the header showing a skeleton indefinitely.
const TIMEOUT_MS = 8000;

/** Kept so a retry can replace it, and so tests can await the boot. */
let inFlight = null;

/**
 * Start the boot. Idempotent — calling twice returns the same promise, so
 * StrictMode's double-invoke does not fire two requests.
 */
export function bootstrapSite() {
  if (inFlight) return inFlight;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  inFlight = fetchLayout(API_BASE_URL, { signal: controller.signal })
    .then((layout) => {
      // Theme first, then the store: the colours are what is visible, and the
      // store update triggers a render that should already be in the new palette.
      applyTheme(layout);
      useSiteStore.getState().setLayout(layout);
      return layout;
    })
    .catch((error) => {
      // The tokens.css fallback stays in place. Nothing is unpainted, and every
      // page that does not need the chrome renders exactly as it would have.
      useSiteStore.getState().setFallback(error);
      return null;
    })
    .finally(() => clearTimeout(timer));

  return inFlight;
}

/** Let a failed boot be retried — the header offers this after a failure. */
export function retryBootstrap() {
  inFlight = null;
  useSiteStore.setState({ status: "loading", error: null });
  return bootstrapSite();
}
