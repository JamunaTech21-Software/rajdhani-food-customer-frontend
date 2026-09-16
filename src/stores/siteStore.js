import { create } from "zustand";

/**
 * The `/public/layout` payload — the site's chrome, fetched once.
 *
 * Every page needs some of this: the header reads `menus.header`, the footer
 * reads three more menus plus `social` and the contact block, and the newsletter
 * form reads whether it is enabled at all. A store rather than a query per
 * component, because this is one request whose answer the whole tree shares.
 *
 * `status` is four-valued on purpose. "loading" and "fallback" look identical in
 * a boolean but mean opposite things to a header: one is "wait, the real menu is
 * coming", the other is "there is no menu and there never will be — render the
 * minimum and stop showing a skeleton".
 */
export const useSiteStore = create((set) => ({
  status: "loading", // loading | ready | fallback
  site: null,
  menus: null,
  social: [],
  newsletter: null,
  error: null,

  setLayout: (layout) =>
    set({
      status: "ready",
      site: layout?.site ?? null,
      menus: layout?.menus ?? null,
      social: layout?.social ?? [],
      newsletter: layout?.newsletter ?? null,
      error: null,
    }),

  /**
   * The layout could not be fetched. Not an error state for the *user* — the
   * catalogue, the forms and every content page still work, because none of
   * them depend on this payload. Only the chrome degrades.
   */
  setFallback: (error) => set({ status: "fallback", error: error ?? null }),
}));

/**
 * Menu links for one location, always an array.
 *
 * The API guarantees every location is present and `[]` when empty, but this is
 * also read while the payload is still in flight — so the guarantee has to hold
 * during loading and after a failure too, or every consumer needs its own `?? []`.
 */
export const menuFor = (location) => useSiteStore.getState().menus?.[location] ?? [];

/** Whether the footer should render its subscribe form (§9.3). */
export const newsletterEnabled = () =>
  useSiteStore.getState().newsletter?.enabled === true;
