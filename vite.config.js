import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

import { contentSecurityPolicy, originOf } from "./csp.js";

/**
 * The API origin, under whichever name the deployment was able to set it.
 *
 * Vite only auto-exposes `VITE_`-prefixed variables to the browser, but that is
 * a rule about *exposure*, not about what the build can see: the host hands
 * every project variable to the build as an ordinary `process.env` entry
 * whatever it is called. Same arrangement as the dashboard, so the two apps can
 * be configured the same way.
 */
const API_URL_NAMES = ["VITE_BASE_URL", "VITE_API_BASE_URL", "API_BASE_URL", "BASE_URL"];
const SITE_URL_NAMES = ["VITE_SITE_URL", "SITE_URL"];

function resolve(env, names) {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return { name, value };
  }
  return null;
}

/**
 * `undefined` rather than `""` when nothing is set, so `config.js`'s `??`
 * fallback still fires — an empty string is not nullish and would silently
 * point every request at this origin.
 */
const literal = (found) => (found ? JSON.stringify(found.value) : "undefined");

const VIEWPORT = '<meta name="viewport" content="width=device-width, initial-scale=1.0" />';

/**
 * The CSP, as a meta tag, in built output only (§14.2, RTPP-66).
 *
 * A meta tag rather than a host header because the policy has to name the API
 * origin in `connect-src`, and that origin is a build-time variable — see the
 * note at the top of `csp.js`. It is placed immediately after the viewport tag
 * so it precedes every stylesheet, script and image the document declares: a
 * policy only governs what the parser has not already reached.
 */
function cspMeta(apiBaseUrl) {
  const policy = contentSecurityPolicy({ apiOrigin: originOf(apiBaseUrl) });

  return {
    name: "rajdhani-csp",
    apply: "build",
    transformIndexHtml(html) {
      if (!html.includes(VIEWPORT)) {
        // The anchor is gone, so the tag would land somewhere arbitrary — or
        // nowhere. Fail the build rather than ship a page with no policy.
        throw new Error("csp: the viewport meta tag was not found in index.html");
      }

      return html.replace(
        VIEWPORT,
        `${VIEWPORT}\n\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`,
      );
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), "") };

  const api = resolve(env, API_URL_NAMES);
  const site = resolve(env, SITE_URL_NAMES);

  // Say which name was used: the failure this guards against is silent — a
  // misspelled variable builds cleanly and 404s on every request at runtime.
  console.log(
    api
      ? `[env] API base URL from ${api.name}=${api.value}`
      : `[env] no API base URL set (tried ${API_URL_NAMES.join(", ")}) — falling back to localhost`,
  );

  /*
    A production build with no API origin is refused.

    `config.js` falls back to `http://localhost:8000/api/v1`, which is right for
    a developer who has not written an .env yet and catastrophic on a host: the
    site builds, deploys, serves, and every single request goes to the visitor's
    own machine. Nothing is logged anywhere we would see it, and the page simply
    shows its empty states forever.

    A build is the last moment this is cheap to notice, so it stops here with the
    variable names spelled out. `vite dev` and `vite build --mode development`
    are unaffected — localhost is the right answer there.
  */
  if (!api && command === "build" && mode === "production") {
    throw new Error(
      [
        "No API base URL is set, so this build would ship pointing at localhost.",
        `Set one of: ${API_URL_NAMES.join(", ")}`,
        "On Vercel: Project → Settings → Environment Variables. See DEPLOY.md.",
      ].join("\n  "),
    );
  }

  return {
    plugins: [tailwindcss(), react(), cspMeta(api?.value)],

    /*
      `static/`, not the conventional `public/`.

      `public/` holds the design comps and the client's supplied image set — 161
      MB of reference material that has to stay on disk but must never ship.
      While it was the public directory every build copied all of it into
      `dist/`: a 162 MB deployment of which 696 kB was the site. See
      public/README.md.
    */
    publicDir: "static",
    define: {
      "import.meta.env.VITE_BASE_URL": literal(api),
      "import.meta.env.VITE_SITE_URL": literal(site),
    },
    resolve: {
      alias: {
        // Vendored inside src/ rather than shared from frontend/shared/: each
        // app deploys from its own root, so a build has no parent directory to
        // reach into (§19 deviation 5).
        "@shared": fileURLToPath(new URL("./src/shared", import.meta.url)),
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      // 5173 is this site's port in the API's CORS allowlist and its SITE_URL;
      // the dashboard holds 5174. Drifting to the next free port puts the app
      // on an origin CORS refuses, which breaks every request with no visible
      // cause — so fail loudly instead.
      port: 5173,
      strictPort: true,
    },
  };
});
