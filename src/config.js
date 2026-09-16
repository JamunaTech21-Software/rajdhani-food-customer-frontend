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
