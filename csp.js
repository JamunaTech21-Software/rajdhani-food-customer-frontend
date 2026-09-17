/**
 * The customer site's Content Security Policy (§14.2).
 *
 * §14.2 asks for a CSP "allowing Cloudinary, Google Fonts, Google Maps and
 * Google Identity". RTPP-66 is where the Maps part earns its keep: the contact
 * page frames a Google map, and an iframe is exactly what a default policy
 * blocks silently — no console error a visitor would see, just an empty box.
 *
 * It lives here, as one function, for two reasons:
 *
 *   1. `connect-src` has to name the API origin, and that origin is an
 *      environment variable — a Cloudflare tunnel in development, a real domain
 *      in production. A policy hardcoded in a committed host config would be
 *      wrong in one of those two places, and wrong here means every request
 *      fails with a message nobody reads.
 *   2. A policy string in a config file is untestable. A function is not.
 *
 * `vite.config.js` calls this at build time and injects the result as a meta
 * tag, so it follows the environment the bundle was built for. `frame-ancestors`
 * cannot be set from a meta tag — `X-Frame-Options: DENY` in `vercel.json` is
 * the half that has to be a real header.
 *
 * Not applied to the dev server: `@vitejs/plugin-react` injects an inline
 * refresh preamble there, which would need `'unsafe-inline'` in `script-src`,
 * and a development policy loose enough to run is a policy that proves nothing
 * about the one that ships.
 */

const GOOGLE_MAPS = ["https://www.google.com", "https://maps.google.com"];
const GOOGLE_RECAPTCHA = ["https://www.google.com", "https://www.gstatic.com"];
const CLOUDINARY = "https://res.cloudinary.com";

// The seed catalogue still points at placehold.co. It goes when the seeds do —
// until then, leaving it out means a site of broken images in staging.
const PLACEHOLDER_IMAGES = "https://placehold.co";

const unique = (values) => [...new Set(values.filter(Boolean))];

/**
 * @param {{ apiOrigin?: string | null }} options
 *   `apiOrigin` is the scheme + host + port of the API — not the full base URL.
 *   CSP source expressions match on origin, so a path is meaningless in one.
 */
export function cspDirectives({ apiOrigin } = {}) {
  return {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    // Tailwind ships a stylesheet, but React writes `style={{…}}` attributes —
    // the theme colours from `site_profile` among them (§18.2) — and those are
    // inline styles as far as CSP is concerned.
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "font-src": ["'self'", "https://fonts.gstatic.com"],
    "img-src": unique(["'self'", "data:", "blob:", CLOUDINARY, PLACEHOLDER_IMAGES]),
    "media-src": unique(["'self'", CLOUDINARY]),
    "script-src": unique(["'self'", ...GOOGLE_RECAPTCHA]),
    "connect-src": unique(["'self'", apiOrigin, ...GOOGLE_RECAPTCHA]),
    // The contact page's map, the banner video modal, and reCAPTCHA's own
    // challenge frame. Without the first two entries both render an empty box.
    "frame-src": unique([...GOOGLE_MAPS, "https://www.youtube-nocookie.com"]),
  };
}

/** The header value: `directive source source; directive source`. */
export function contentSecurityPolicy(options) {
  return Object.entries(cspDirectives(options))
    .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
    .join("; ");
}

/**
 * The origin of an API base URL, or null.
 *
 * `https://api.example.com/api/v1` → `https://api.example.com`. Passing the path
 * through would produce a source expression that matches nothing, and a policy
 * that blocks every API call is worse than no policy at all.
 */
export function originOf(baseUrl) {
  try {
    const { protocol, origin } = new URL(String(baseUrl));

    // `new URL("localhost:8000")` parses — as a URL with the scheme
    // "localhost:" — and its origin is the *string* "null". Emitting that as a
    // source expression is a parse error the browser answers by dropping the
    // whole directive, which is worse than having no entry for the API at all.
    return (protocol === "http:" || protocol === "https:") && origin !== "null" ? origin : null;
  } catch {
    return null;
  }
}
