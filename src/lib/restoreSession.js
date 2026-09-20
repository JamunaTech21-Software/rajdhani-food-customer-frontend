import { api } from "./api.js";
import { toSession } from "./session.js";
import { useAuthStore } from "../stores/authStore.js";

/**
 * Turn the refresh cookie back into a session, once, at boot (§7.1).
 *
 * This is RTPP-68's third criterion. The access token lives in memory only and
 * dies with the tab; the refresh cookie is HttpOnly, `SameSite`, and survives a
 * reload. Without this call a signed-in customer is anonymous on every refresh —
 * the cookie is still there, nothing ever asks it anything.
 *
 * Started from `main.jsx` beside the layout fetch rather than from an effect,
 * for the same reason: an effect runs after first paint, so the header would
 * show "Sign in" to someone who is about to be restored. `status` starts
 * "unknown" precisely so it can show neither state until this settles.
 *
 * A failure is not an error. The overwhelmingly common case is a visitor who
 * has never signed in and has no cookie at all, and the API answers that with a
 * 401 — which is the correct answer, not a fault to report.
 *
 * `auth: false` matters: with a bearer header the shared client would treat the
 * 401 as an expired token and call refresh again, from inside refresh.
 */
let inFlight = null;

export function restoreSession() {
  if (inFlight) return inFlight;

  inFlight = api
    .post("/auth/customer/refresh", undefined, { auth: false })
    .then((payload) => {
      const session = toSession(payload);
      if (session) useAuthStore.getState().setSession(session);
      else useAuthStore.getState().clear();
      return session;
    })
    .catch(() => {
      useAuthStore.getState().clear();
      return null;
    });

  return inFlight;
}

/** Sign out: drop the cookie server-side, then the session here. */
export async function signOut() {
  try {
    await api.post("/auth/customer/logout", undefined, { auth: false });
  } catch {
    // The cookie may already be gone, or the network may be down. Either way
    // the local session must not survive a deliberate sign-out.
  } finally {
    inFlight = null;
    useAuthStore.getState().clear();
  }
}
