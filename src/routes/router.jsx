import { createBrowserRouter } from "react-router";

import { SiteLayout } from "../components/layout/SiteLayout.jsx";
import { DealerPage } from "../pages/DealerPage.jsx";
import { GalleryPage } from "../pages/GalleryPage.jsx";
import { HomePage } from "../pages/HomePage.jsx";
import { ProductDetailPage } from "../pages/ProductDetailPage.jsx";
import { ProductsPage } from "../pages/ProductsPage.jsx";
import { ScaffoldPage } from "../pages/ScaffoldPage.jsx";

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
      { path: "/dealer", element: <DealerPage /> },
      { path: "/gallery", element: <GalleryPage /> },
      { path: "/gallery/:slug", element: <GalleryPage /> },
      { path: "/products", element: <ProductsPage /> },
      { path: "/products/:slug", element: <ProductDetailPage /> },
      { path: "/scaffold", element: <ScaffoldPage /> },
    ],
  },
]);
