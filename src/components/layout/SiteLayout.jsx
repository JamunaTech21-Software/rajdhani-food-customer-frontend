import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";

import { Footer } from "./Footer.jsx";
import { Header } from "./Header.jsx";
import { ScrollManager } from "./ScrollManager.jsx";
import { JsonLd } from "../seo/Seo.jsx";
import { ErrorBoundary } from "../state/ErrorBoundary.jsx";
import { organizationJsonLd, webSiteJsonLd } from "../../lib/seo.js";
import { startTagManager, trackPageView } from "../../lib/gtm.js";
import { SITE_URL } from "../../config.js";
import { useSiteStore } from "../../stores/siteStore.js";

/**
 * Analytics, and the page views a single-page app does not fire for itself.
 *
 * Without the second effect every visit reads as a one-page session, because
 * the container script runs once and nothing tells it the route changed.
 */
function useAnalytics() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    startTagManager();
  }, []);

  useEffect(() => {
    // After the title has been set for the new route — `useSeo` runs its
    // effect on the page below, and a page view sent first carries the old
    // title, which makes every report read one route behind.
    const timer = setTimeout(() => trackPageView(`${pathname}${search}`, document.title), 0);
    return () => clearTimeout(timer);
  }, [pathname, search]);
}

/**
 * The two site-wide structured-data blocks (§14.3).
 *
 * Rendered from the layout rather than from every page: they describe the site,
 * not the route, and repeating them per page is how one of them ends up stale.
 *
 * Structured data only — **the layout deliberately calls no `useSeo`.** The head
 * belongs to the route, and a second one here would race the page's: whichever
 * effect ran last would win the title, which is the sort of thing that works in
 * development and picks the wrong one in a build.
 */
function SiteSeo() {
  const site = useSiteStore((s) => s.site);
  const social = useSiteStore((s) => s.social);

  // Nothing until the layout payload lands — a half-built Organization block
  // naming no address is worse structured data than none.
  if (!site?.name) return null;

  return (
    <>
      <JsonLd id="organization" data={organizationJsonLd(site, { siteUrl: SITE_URL, social })} />
      <JsonLd id="website" data={webSiteJsonLd(site, { siteUrl: SITE_URL })} />
    </>
  );
}

/**
 * The chrome every page sits inside.
 *
 * The skip link is first in the DOM and only visible on focus: without it a
 * keyboard user tabs through the whole header — logo, eight nav links, the
 * Products disclosure and the CTA — on every single page before reaching the
 * content. §18 requires AA, and this is the cheapest part of it.
 */
export function SiteLayout() {
  const { pathname } = useLocation();

  useAnalytics();

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Renders nothing; decides where each route change leaves the window. */}
      <ScrollManager />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-on-brand"
      >
        Skip to content
      </a>

      <SiteSeo />

      <Header />

      <main id="main" className="flex-1">
        {/*
          Around the page, not around the whole app: a page that throws
          collapses to a panel, and the header and footer — the only way out —
          survive. Keyed on the path so navigating away from a broken page
          clears the error rather than carrying it to the next one, which is the
          classic way a single bad product makes the whole site look broken.

          The router errorElement above is the layer beneath this one, for when
          the chrome itself is what failed.
        */}
        <ErrorBoundary key={pathname} name="page">
          <Outlet />
        </ErrorBoundary>
      </main>

      <Footer />

      {/* No floating WhatsApp button. It is built and parked in
          `WhatsAppButton.jsx` — mounting it again is this one line back. */}
    </div>
  );
}
