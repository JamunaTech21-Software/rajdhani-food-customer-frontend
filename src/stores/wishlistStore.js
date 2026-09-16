import { create } from "zustand";

/**
 * Which products are wishlisted, as a client-side mirror of the server's list.
 *
 * A Set of product ids rather than the products themselves: every card on every
 * listing needs to answer "is this one saved" on render, and that has to be an
 * O(1) lookup rather than a scan of a product array.
 *
 * The server is the authority (`/public/wishlist`, §9.7). This store exists so
 * a heart fills the instant it is clicked instead of after a round trip — and
 * so it can be put back if that round trip fails.
 */
export const useWishlistStore = create((set, get) => ({
  ids: new Set(),
  isLoaded: false,

  /** Replace the whole set from a server response. */
  hydrate: (productIds) => set({ ids: new Set(productIds ?? []), isLoaded: true }),

  has: (productId) => get().ids.has(productId),

  /** Optimistic toggle. Returns what it became, so the caller can undo it. */
  toggle: (productId) => {
    const next = new Set(get().ids);
    const added = !next.has(productId);

    if (added) next.add(productId);
    else next.delete(productId);

    set({ ids: next });
    return added;
  },

  /** Put one id back the way it was, after a failed request. */
  restore: (productId, wasPresent) => {
    const next = new Set(get().ids);
    if (wasPresent) next.add(productId);
    else next.delete(productId);
    set({ ids: next });
  },

  // Signing out must not leave the previous customer's saved products visible.
  clear: () => set({ ids: new Set(), isLoaded: false }),
}));
