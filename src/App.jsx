import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router";

import { queryClient } from "./lib/queryClient.js";
import { router } from "./routes/router.jsx";

/**
 * The boot lives in `main.jsx`, not here: it has to start before React mounts,
 * and anything in this component — effect or render — is already too late.
 */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
