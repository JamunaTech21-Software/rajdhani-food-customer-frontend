import { QueryClient } from "@tanstack/react-query";

// A 4xx is the server's considered answer, not a blip — retrying a 404 three
// times just delays the empty state by a second.
const FINAL = new Set([400, 401, 403, 404, 409, 422]);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Catalogue content changes on an editor's timescale, not a visitor's, so
      // a minute of staleness avoids refetching the same products on every
      // navigation within a session.
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (count, error) => !FINAL.has(error?.status) && count < 2,
    },
    mutations: { retry: false },
  },
});
