import { GTM_ID } from "../config.js";

/**
 * Google Tag Manager (§14.3, RTPP-71).
 *
 * The container ID is a **setting** in the API (`settings.gtm_id`, group
 * `analytics`) and also a build variable in §19's env list. It is not exposed
 * on `/public/layout`, so the build variable is the one that can actually be
 * read — and it is empty today, so nothing loads.
 *
 * **Nothing loads when it is unset, and that is the point.** GTM is a script
 * that can inject arbitrary further scripts; loading an empty container would
 * add a request, a cookie banner's worth of legal surface and a CSP hole in
 * exchange for no measurement at all.
 *
 * The `<noscript>` iframe half is deliberately absent. It exists to count
 * visitors with JavaScript disabled — who by definition cannot see this
 * single-page app either, so it would count nobody and frame a third party on
 * every page to do it.
 */
const SCRIPT_ID = "gtm";

let started = false;

export function startTagManager() {
  if (!GTM_ID || started || typeof document === "undefined") return false;
  if (document.getElementById(SCRIPT_ID)) return false;

  started = true;

  // The dataLayer has to exist before the container script runs, and the
  // `gtm.start` event is what GTM's own timing report is measured from.
  globalThis.dataLayer = globalThis.dataLayer ?? [];
  globalThis.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`;
  document.head.append(script);

  return true;
}

/**
 * Tell GTM the route changed.
 *
 * A single-page app fires one page view ever, at boot, unless something says
 * otherwise — so without this every visit reads as a one-page session and every
 * funnel measures nothing.
 */
export function trackPageView(path, title) {
  if (!GTM_ID || typeof globalThis.dataLayer === "undefined") return;
  globalThis.dataLayer.push({ event: "page_view", page_path: path, page_title: title });
}
