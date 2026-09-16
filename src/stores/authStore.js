import { create } from "zustand";

/**
 * The customer session (§7.2, §9.7).
 *
 * The access token lives in memory only, exactly as the dashboard's does — a
 * token in localStorage is readable by any script that reaches the page. The
 * refresh cookie is HttpOnly and travels on its own.
 *
 * `status` starts "unknown" rather than "anonymous" so the header can avoid
 * flashing "Sign in" at someone who is about to be restored as signed in.
 */
export const useAuthStore = create((set) => ({
  status: "unknown", // unknown | authenticated | anonymous
  accessToken: null,
  customer: null,

  setSession: (session) =>
    set({
      status: "authenticated",
      accessToken: session?.tokens?.access_token ?? null,
      customer: session?.customer ?? null,
    }),

  setCustomer: (customer) => set({ customer }),

  clear: () => set({ status: "anonymous", accessToken: null, customer: null }),
}));

export const isSignedIn = () => useAuthStore.getState().status === "authenticated";
