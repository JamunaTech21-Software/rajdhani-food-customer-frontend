import { create } from "zustand";

import { accountApi } from "../lib/api.js";
import {
  applyServerItems,
  applyServerList,
  idsOf,
  nextDesire,
  readGuestList,
  shouldResend,
  syncPlan,
  writeGuestList,
} from "../lib/wishlist.js";
import { useAuthStore } from "./authStore.js";

const storage = () => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

/**
 * The wishlist (§10, §18.6).
 *
 * Zustand for the optimistic view, the server for the truth — the ticket's own
 * framing. What the store adds on top is the guarantee that the two converge:
 * one request in flight per product, and a pending intent that outlives the
 * response it contradicts. See `lib/wishlist.js` for why both are needed.
 *
 * `pending` is a `Map` of product id → what the customer wants. It is the
 * store's memory of clicks the server has not confirmed yet, and it is what
 * makes a double-click end in the right place rather than merely settling
 * somewhere.
 */
export const useWishlistStore = create((set, get) => ({
  /** Whole `ProductCard`s, newest first, as the API returns them. */
  items: [],
  /** Their ids, for the O(1) membership test every card on a grid performs. */
  ids: new Set(),
  /** Product id → desired state, for anything the server has not confirmed. */
  pending: new Map(),
  /** Product ids with a request in the air, so a second one is not started. */
  inFlight: new Set(),
  status: "idle", // idle | loading | ready | error
  /** Set when a signed-out visitor tries to save something. */
  prompt: null,

  has: (productId) => get().ids.has(productId),

  dismissPrompt: () => set({ prompt: null }),

  /** Replace everything from a server response, honouring pending intent. */
  applyServer(payload) {
    const items = payload?.items ?? payload ?? [];
    const { pending } = get();

    set({
      items: applyServerItems(items, pending),
      ids: applyServerList(idsOf(items), pending),
      status: "ready",
    });
  },

  /** Load the list for a signed-in customer. */
  async load() {
    if (useAuthStore.getState().status !== "authenticated") return;

    set({ status: "loading" });
    try {
      get().applyServer(await accountApi.list("/public/wishlist"));
    } catch {
      set({ status: "error" });
    }
  },

  /**
   * Merge whatever this browser saved while signed out, once, at sign-in.
   *
   * This is what stops a guest's action being silently lost: the click is kept
   * locally and posted the moment there is an account to attach it to. Any id
   * the API cannot resolve is skipped on its side rather than failing the call,
   * which matters because local storage is client-controlled and goes stale.
   */
  async mergeGuest() {
    if (useAuthStore.getState().status !== "authenticated") return;

    const guests = readGuestList(storage());
    if (guests.length === 0) return get().load();

    try {
      get().applyServer(await accountApi.post("/public/wishlist/merge", { productIds: guests }));
      writeGuestList(storage(), []);
    } catch {
      // Keep the local copy: a failed merge that also threw the guest's list
      // away would lose exactly what the merge exists to preserve.
      await get().load();
    }
  },

  /**
   * Toggle one product.
   *
   * Signed out, the intent is kept locally and a prompt is raised — never
   * dropped. Signed in, the view updates at once and `sync` reconciles.
   */
  toggle(product) {
    const productId = typeof product === "string" ? product : product?.id;
    if (!productId) return;

    const { ids, items } = get();
    const desired = nextDesire(ids, productId);

    if (useAuthStore.getState().status !== "authenticated") {
      const next = new Set(ids);
      if (desired) next.add(productId);
      else next.delete(productId);

      writeGuestList(storage(), [...next]);
      set({
        ids: next,
        // No card to show for a guest addition: the catalogue has the data, the
        // wishlist page does not, and inventing one would be a second source of
        // product truth. The page asks the customer to sign in instead.
        items: desired ? items : items.filter((item) => item.id !== productId),
        prompt: desired ? { productId, reason: "save" } : null,
      });
      return;
    }

    const pending = new Map(get().pending).set(productId, desired);
    const next = new Set(ids);
    if (desired) next.add(productId);
    else next.delete(productId);

    set({
      ids: next,
      items: desired ? items : items.filter((item) => item.id !== productId),
      pending,
      prompt: null,
    });

    get().sync(productId);
  },

  /**
   * Send the customer's intent, one request at a time per product.
   *
   * The loop is the point. A second click while the first request is in the air
   * does not start a second request — it changes what this loop will send next.
   * Two requests in flight can arrive at the *server* out of order, and no
   * amount of client-side reconciliation can fix a server that ended up holding
   * the wrong answer.
   */
  async sync(productId) {
    if (get().inFlight.has(productId)) return;

    set({ inFlight: new Set(get().inFlight).add(productId) });

    try {
      for (;;) {
        const sent = get().pending.get(productId);
        if (sent === undefined) break;

        const plan = syncPlan(productId, sent);
        const payload =
          plan.method === "POST"
            ? await accountApi.post(plan.path, plan.body)
            : await accountApi.delete(plan.path);

        const desired = get().pending.get(productId);
        if (shouldResend(sent, desired)) continue;

        // Confirmed: drop the intent *before* applying, so the server's answer
        // is taken at face value for this product.
        const pending = new Map(get().pending);
        pending.delete(productId);
        set({ pending });

        get().applyServer(payload?.items ?? payload);
        break;
      }
    } catch {
      // The server did not accept it. Drop the intent and re-read, rather than
      // leaving the view asserting something that never happened.
      const pending = new Map(get().pending);
      pending.delete(productId);
      set({ pending });
      await get().load();
    } finally {
      const inFlight = new Set(get().inFlight);
      inFlight.delete(productId);
      set({ inFlight });
    }
  },

  /** Signing out leaves nothing of this customer behind. */
  reset() {
    set({ items: [], ids: new Set(), pending: new Map(), inFlight: new Set(), status: "idle", prompt: null });
  },

  /** A guest's saved ids, so the heart is filled before they sign in. */
  hydrateGuest() {
    if (useAuthStore.getState().status === "authenticated") return;
    set({ ids: new Set(readGuestList(storage())), status: "ready" });
  },
}));
