import { Outlet } from "react-router";

import { Footer } from "./Footer.jsx";
import { Header } from "./Header.jsx";

/**
 * The chrome every page sits inside.
 *
 * The skip link is first in the DOM and only visible on focus: without it a
 * keyboard user tabs through the whole header — logo, eight nav links, the
 * Products disclosure and the CTA — on every single page before reaching the
 * content. §18 requires AA, and this is the cheapest part of it.
 */
export function SiteLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-on-brand"
      >
        Skip to content
      </a>

      <Header />

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
