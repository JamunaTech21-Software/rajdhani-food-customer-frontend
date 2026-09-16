import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { RouterProvider } from "react-router";

import { applyTheme } from "@shared/theme/applyTheme.js";

import { publicApi } from "./lib/api.js";
import { queryClient } from "./lib/queryClient.js";
import { router } from "./routes/router.jsx";

/**
 * Paint the site in whatever colours the admin has set (§6.4, §18.2).
 *
 * This is the whole of RTPP-56's first acceptance criterion: the theme is
 * fetched, not compiled in, so changing `primary_color` in the dashboard
 * restyles this site on its next load with no code change and no deploy.
 *
 * A failure leaves the `tokens.css` fallback in place rather than an unpainted
 * page — the brand's real colours are the common case, but a site that renders
 * unstyled because one request failed is worse than one rendering the defaults.
 */
function useTheme() {
  useEffect(() => {
    publicApi
      .get("/public/layout")
      .then(applyTheme)
      .catch(() => {});
  }, []);
}

export default function App() {
  useTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
