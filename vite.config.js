import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

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

export default defineConfig(({ mode }) => {
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

  return {
    plugins: [tailwindcss(), react()],
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
