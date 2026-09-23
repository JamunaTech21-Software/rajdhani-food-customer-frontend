// Not `BASE_URL`: Vite already defines `import.meta.env.BASE_URL` as the app's
// public base path ("/"). Reusing that name would read the built-in instead, and
// every request would silently resolve against this origin rather than the API.
export const API_BASE_URL =
  import.meta.env.VITE_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000/api/v1";

/** This site's own origin, for canonical URLs and JSON-LD (§14.3). */
export const SITE_URL =
  import.meta.env.VITE_SITE_URL?.replace(/\/$/, "") ?? "https://rajdhanifood.com";

/**
 * reCAPTCHA v3 **site** key — publishable by design, and the only kind that may
 * be here (§14.2). Its secret counterpart lives in the backend `.env` and never
 * reaches a browser.
 *
 * Unset today. Every form works without it: the API accepts submissions with no
 * token while its own secret is unconfigured, so the forms must not gate on one.
 */
export const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY ?? null;

/**
 * Google Identity Services **client** ID — publishable by design (§7.1), and it
 * has to be: the browser is what mints the ID token the API then verifies
 * against Google's public keys.
 *
 * Unset today. Sign-in is hidden rather than broken when it is missing, the
 * same arrangement as the reCAPTCHA key: a button that opens a Google dialog
 * saying "invalid client" is worse than no button.
 */
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? null;

/**
 * Google Tag Manager container ID (§14.3).
 *
 * Unset today, and nothing loads without it — see `lib/gtm.js` for why that is
 * deliberate rather than a gap. The API also holds one as a setting, but does
 * not expose it publicly, so this is the value that can be read.
 */
export const GTM_ID = import.meta.env.VITE_GTM_ID ?? null;

/**
 * Whether this is a development build (§10.5).
 *
 * Vite defines `DEV` itself, so unlike everything above there is no variable to
 * set — but it belongs here anyway, because `config.js` is the only module
 * allowed to read `import.meta.env` and a lint rule enforces that. The error
 * page uses it to decide whether showing a raw error message helps a developer
 * or leaks internals to a visitor.
 */
export const IS_DEV = import.meta.env.DEV === true;

/**
 * TEMPORARY — whether the Quality page's stand-in content is used (§10.4).
 *
 * The comp draws six sections and four of their resources are still empty on
 * the live API, so there is nothing to design against. `lib/contentFixtures.js`
 * supplies rows in the API's own shape until an editor publishes the real ones,
 * and real rows always win over them.
 *
 * On in development and off in a production build, so a deployed site never
 * shows invented certifications or a process the company has not described.
 * `VITE_CONTENT_FIXTURES=1` turns them on in a preview build — useful for
 * showing the finished design to the client — and `=0` turns them off locally,
 * to develop against the real, emptier API.
 *
 * Delete this along with the fixtures module.
 */
export const CONTENT_FIXTURES =
  import.meta.env.VITE_CONTENT_FIXTURES === "1" ||
  (import.meta.env.VITE_CONTENT_FIXTURES !== "0" && import.meta.env.DEV === true);
