/**
 * The wishlist's arithmetic (§8.6, §9.7, §18.6).
 *
 * The server is the source of truth and every mutation returns the whole list,
 * so most of this is bookkeeping. The part that is not is the second acceptance
 * criterion — *toggling twice quickly does not leave the UI and server out of
 * sync* — which is a race with three distinct ways to lose:
 *
 *   1. **Responses out of order.** Two requests in flight can come back either
 *      way round, and the later *arrival* would win over the later *click*.
 *   2. **Requests out of order.** Worse, and easy to miss: the API is
 *      idempotent per call, but if a DELETE overtakes a POST on the wire the
 *      *server* ends up saved when the customer last asked for removed. No
 *      client-side reconciliation can fix that, because the server is right by
 *      definition and it is holding the wrong answer.
 *   3. **A stale response overwriting a newer intent.** The response carries
 *      the full list, so applying it blindly reverts anything clicked since.
 *
 * (1) and (2) are both solved by never having two requests in flight for one
 * product: `syncPlan` drives a loop that sends, waits, and only then sends
 * again if the desire changed meanwhile. (3) is solved by `applyServerList`,
 * which lets a still-pending intent survive the list it contradicts.
 */

/** The product ids on a list of cards, as a Set — membership is the hot path. */
export function idsOf(items) {
  return new Set((Array.isArray(items) ? items : []).map((item) => item?.id).filter(Boolean));
}

/**
 * What one click means.
 *
 * Read from the *desired* state rather than from the last server answer, so a
 * second click while the first is still in flight toggles away from what was
 * just asked for, not from what the server last said.
 */
export const nextDesire = (ids, productId) => !ids.has(productId);

/**
 * Whether the loop should go round again.
 *
 * `sent` is what the request that just finished asked for; `desired` is what
 * the customer wants now. They differ exactly when something was clicked while
 * that request was in the air.
 */
export const shouldResend = (sent, desired) => sent !== desired;

/**
 * The server's list, with in-flight intent preserved.
 *
 * A response describes the world as it was when the server answered. Anything
 * clicked since is still on its way there, and must not be reverted on screen
 * for the half-second until it arrives — that flicker is the visible half of
 * criterion 2.
 *
 * @param {Iterable<string>} serverIds  what the API just returned
 * @param {Map<string, boolean>} pending  product id → what the customer wants
 */
export function applyServerList(serverIds, pending) {
  const ids = new Set(serverIds);

  for (const [productId, wanted] of pending ?? []) {
    if (wanted) ids.add(productId);
    else ids.delete(productId);
  }

  return ids;
}

/**
 * The same, for the cards themselves.
 *
 * The server sends whole `ProductCard`s and the page renders them, so the list
 * has to be filtered the same way the id set is — otherwise a product removed
 * a moment ago stays on screen until the next response.
 *
 * A product added while offline of the server's knowledge cannot be *shown*
 * here, because there is no card for it yet; it will arrive with the next
 * response. Removals, which are the visible case, are immediate.
 */
export function applyServerItems(items, pending) {
  const list = Array.isArray(items) ? items : [];
  if (!pending?.size) return list;

  return list.filter((item) => pending.get(item?.id) !== false);
}

// ── The guest list ────────────────────────────────────────────────────────

export const GUEST_KEY = "rajdhani.wishlist.guest";

/** A cap, so a script or a stuck loop cannot fill someone's storage quota. */
const GUEST_LIMIT = 100;

/**
 * Read the guest wishlist.
 *
 * Storage is passed in rather than reached for, so this is testable and so a
 * private window — where `localStorage` exists but throws on access — is a
 * caught exception rather than a blank page.
 *
 * Everything here is client-controlled and can be edited by hand, so the shape
 * is checked rather than trusted. The API says the same of its own input: a
 * stale id is skipped, not an error.
 */
export function readGuestList(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(GUEST_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];

    return [...new Set(parsed.filter((id) => typeof id === "string" && id.length > 0))].slice(
      0,
      GUEST_LIMIT,
    );
  } catch {
    return [];
  }
}

export function writeGuestList(storage, ids) {
  try {
    const list = [...new Set(ids)].slice(0, GUEST_LIMIT);
    if (list.length === 0) storage?.removeItem(GUEST_KEY);
    else storage?.setItem(GUEST_KEY, JSON.stringify(list));
    return list;
  } catch {
    // Quota full, or storage blocked. The wishlist is a convenience; losing a
    // guest's copy of it must not break the page they are on.
    return [];
  }
}

/** The plan for one sync pass: which call to make for this product. */
export function syncPlan(productId, desired) {
  return desired
    ? { method: "POST", path: "/public/wishlist", body: { productId } }
    : { method: "DELETE", path: `/public/wishlist/${encodeURIComponent(productId)}`, body: null };
}
