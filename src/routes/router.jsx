import { createBrowserRouter } from "react-router";

import { SiteLayout } from "../components/layout/SiteLayout.jsx";
import { AboutPage } from "../pages/AboutPage.jsx";
import { ContactPage } from "../pages/ContactPage.jsx";
import { DealerPage } from "../pages/DealerPage.jsx";
import { GalleryPage } from "../pages/GalleryPage.jsx";
import { HomePage } from "../pages/HomePage.jsx";
import { LegalPage } from "../pages/LegalPage.jsx";
import { NewsArticlePage } from "../pages/NewsArticlePage.jsx";
import { NewsPage } from "../pages/NewsPage.jsx";
import { ProductDetailPage } from "../pages/ProductDetailPage.jsx";
import { ProductsPage } from "../pages/ProductsPage.jsx";
import { QualityPage } from "../pages/QualityPage.jsx";
import { ScaffoldPage } from "../pages/ScaffoldPage.jsx";
import { PAGE_KEYS } from "../lib/pageContent.js";

/**
 * The remaining pages arrive from RTPP-60 onward. `/scaffold` stays until the
 * phase is done — it is the only place the theme and image pipeline are visible
 * in isolation, which is what makes RTPP-56 and RTPP-57 checkable by hand.
 */
export const router = createBrowserRouter([
  {
    element: <SiteLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/about", element: <AboutPage /> },
      { path: "/contact", element: <ContactPage /> },
      { path: "/dealer", element: <DealerPage /> },
      { path: "/gallery", element: <GalleryPage /> },
      { path: "/gallery/:slug", element: <GalleryPage /> },
      { path: "/news", element: <NewsPage /> },
      { path: "/news/:slug", element: <NewsArticlePage /> },
      { path: "/products", element: <ProductsPage /> },
      { path: "/products/:slug", element: <ProductDetailPage /> },
      { path: "/quality", element: <QualityPage /> },

      // The API's own page keys and the URLs its `legal` menu links, not the
      // /privacy-policy and /terms-conditions the ticket text guesses at — a
      // route the site's own footer does not link to is a page nobody reaches.
      {
        path: "/privacy",
        element: <LegalPage pageKey={PAGE_KEYS.privacy} title="Privacy Policy" />,
      },
      { path: "/terms", element: <LegalPage pageKey={PAGE_KEYS.terms} title="Terms of Service" /> },
      { path: "/scaffold", element: <ScaffoldPage /> },
    ],
  },
]);
