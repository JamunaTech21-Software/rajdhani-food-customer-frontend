import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import {
  applyServerItems,
  applyServerList,
  GUEST_KEY,
  idsOf,
  nextDesire,
  readGuestList,
  shouldResend,
  syncPlan,
  writeGuestList,
} from "../src/lib/wishlist.js";

const read = (path) => readFileSync(fileURLToPath(new URL(`../src/${path}`, import.meta.url)), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const card = (id, name = id) => ({ id, name, slug: name.toLowerCase() });

/** A localStorage stand-in, and one that refuses — a private window does. */
const fakeStorage = () => {
  const map = new Map();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
    _map: map,
  };
};
const hostileStorage = () => ({
  getItem() { throw new Error("blocked"); },
  setItem() { throw new Error("blocked"); },
  removeItem() { throw new Error("blocked"); },
});

// ── Criterion 2: two fast toggles end in the right place ──────────────────

test("a second click toggles away from what was just asked for", () => {
  // Read from the desired state, not from the last server answer — otherwise a
  // click while a request is in the air repeats the same request.
  const ids = new Set(["A"]);

  assert.equal(nextDesire(ids, "A"), false);
  assert.equal(nextDesire(ids, "B"), true);
});

test("the loop goes round again exactly when the desire changed mid-flight", () => {
  assert.equal(shouldResend(true, false), true);
  assert.equal(shouldResend(false, true), true);
  assert.equal(shouldResend(true, true), false);
  // Nothing pending: the intent was confirmed and deleted.
  assert.equal(shouldResend(true, undefined), true);
});

test("a stale response does not revert a newer click", () => {
  // The response carries the whole list as it was when the server answered.
  // Applying it blindly undoes anything clicked since — the visible half of
  // the criterion.
  const server = ["A", "B"];
  const pending = new Map([["B", false], ["C", true]]);

  assert.deepEqual([...applyServerList(server, pending)].sort(), ["A", "C"]);
});

test("with nothing pending the server is taken at its word", () => {
  assert.deepEqual([...applyServerList(["A", "B"], new Map())].sort(), ["A", "B"]);
  assert.deepEqual([...applyServerList(["A"], undefined)], ["A"]);
});

test("a removal disappears from the list at once, not when the server agrees", () => {
  const items = [card("A"), card("B"), card("C")];
  const pending = new Map([["B", false]]);

  assert.deepEqual(applyServerItems(items, pending).map((i) => i.id), ["A", "C"]);
});

test("a pending addition does not invent a card", () => {
  // There is no `ProductCard` for it yet. It arrives with the next response;
  // inventing one would be a second source of product truth.
  const items = [card("A")];
  assert.deepEqual(applyServerItems(items, new Map([["Z", true]])).map((i) => i.id), ["A"]);
});

test("the plan for each direction hits the right endpoint", () => {
  assert.deepEqual(syncPlan("01ABC", true), {
    method: "POST",
    path: "/public/wishlist",
    body: { productId: "01ABC" },
  });
  assert.deepEqual(syncPlan("01ABC", false), {
    method: "DELETE",
    path: "/public/wishlist/01ABC",
    body: null,
  });
});

test("the body uses the API's own spelling", () => {
  // `productId`, not `product_id`. This endpoint is camelCase where the rest of
  // the API is snake_case, and the wrong one is a 422.
  assert.ok("productId" in syncPlan("x", true).body);
  assert.equal("product_id" in syncPlan("x", true).body, false);
});

test("an id is escaped on its way into the path", () => {
  assert.match(syncPlan("a/b", false).path, /a%2Fb$/);
});

// ── Membership ────────────────────────────────────────────────────────────

test("ids are a Set, because every card on a grid asks", () => {
  const ids = idsOf([card("A"), card("B"), null, { name: "no id" }]);

  assert.ok(ids instanceof Set);
  assert.deepEqual([...ids].sort(), ["A", "B"]);
});

test("a malformed list is an empty set rather than a crash", () => {
  for (const input of [null, undefined, "nope", 7, {}]) {
    assert.equal(idsOf(input).size, 0);
  }
});

// ── The guest list ────────────────────────────────────────────────────────

test("a guest's saves survive a reload", () => {
  // This is what stops the action being silently lost before there is an
  // account to attach it to.
  const storage = fakeStorage();
  writeGuestList(storage, ["A", "B"]);

  assert.deepEqual(readGuestList(storage), ["A", "B"]);
  assert.equal(storage._map.has(GUEST_KEY), true);
});

test("an empty list removes the key rather than storing []", () => {
  const storage = fakeStorage();
  writeGuestList(storage, ["A"]);
  writeGuestList(storage, []);

  assert.equal(storage._map.has(GUEST_KEY), false);
  assert.deepEqual(readGuestList(storage), []);
});

test("duplicates are collapsed", () => {
  const storage = fakeStorage();
  writeGuestList(storage, ["A", "A", "B", "A"]);
  assert.deepEqual(readGuestList(storage), ["A", "B"]);
});

test("hand-edited storage is checked, not trusted", () => {
  // It is client-controlled. The API says the same of its own input: a stale id
  // is skipped rather than failing the call.
  const storage = fakeStorage();

  for (const raw of ['{"not":"an array"}', "[1,2,3]", '["ok", 7, null, ""]', "not json at all"]) {
    storage.setItem(GUEST_KEY, raw);
    const list = readGuestList(storage);
    assert.ok(Array.isArray(list));
    for (const id of list) assert.equal(typeof id, "string");
  }

  storage.setItem(GUEST_KEY, '["ok", 7, null, ""]');
  assert.deepEqual(readGuestList(storage), ["ok"]);
});

test("a hostile or absent storage is survivable", () => {
  // `localStorage` exists in a private window and throws on access. The
  // wishlist is a convenience; losing it must not break the page.
  assert.deepEqual(readGuestList(hostileStorage()), []);
  assert.deepEqual(writeGuestList(hostileStorage(), ["A"]), []);
  assert.deepEqual(readGuestList(null), []);
  assert.deepEqual(writeGuestList(null, ["A"]), ["A"]);
});

test("the guest list is capped", () => {
  const storage = fakeStorage();
  const many = Array.from({ length: 250 }, (_, i) => `id-${i}`);

  assert.equal(writeGuestList(storage, many).length, 100);
  assert.equal(readGuestList(storage).length, 100);
});

// ── Wiring ────────────────────────────────────────────────────────────────

const store = strip(read("stores/wishlistStore.js"));

test("only one request is ever in flight for a product", () => {
  // The part no client-side reconciliation can substitute for: two requests can
  // reach the *server* out of order, and then the server itself holds the wrong
  // answer. The loop sends, waits, and only then sends again.
  assert.match(store, /if \(get\(\)\.inFlight\.has\(productId\)\) return;/);
  assert.match(store, /for \(;;\) \{/);
  assert.match(store, /if \(shouldResend\(sent, desired\)\) continue;/);
});

test("the intent is cleared before the server's answer is applied", () => {
  // Otherwise `applyServerList` would override the very response that
  // confirmed it, and the product would flip back.
  assert.match(store, /pending\.delete\(productId\);\s*\n\s*set\(\{ pending \}\);\s*\n\s*get\(\)\.applyServer/);
});

test("a failed toggle re-reads rather than leaving a claim standing", () => {
  assert.match(store, /} catch \{[\s\S]*?await get\(\)\.load\(\);/);
  assert.match(store, /} finally \{[\s\S]*?inFlight\.delete\(productId\)/);
});

test("a signed-out click is kept, not dropped", () => {
  // The scope's fourth line. It goes to local storage and raises a prompt; the
  // merge at sign-in is what finally posts it.
  assert.match(store, /writeGuestList\(storage\(\), \[\.\.\.next\]\)/);
  assert.match(store, /prompt: desired \? \{ productId, reason: "save" \} : null/);
});

test("a failed merge keeps the guest list", () => {
  // Throwing it away would lose exactly what the merge exists to preserve.
  assert.match(store, /await get\(\)\.load\(\);\s*\n\s*\}\s*\n\s*\},/);
  const merge = store.slice(store.indexOf("async mergeGuest"), store.indexOf("toggle(product)"));
  assert.equal(merge.includes("writeGuestList(storage(), [])"), true, "cleared only on success");
  assert.equal(merge.indexOf("writeGuestList(storage(), [])") < merge.indexOf("} catch"), true);
});

test("signing out leaves nothing of that customer behind", () => {
  const layout = strip(read("components/layout/SiteLayout.jsx"));

  assert.match(store, /reset\(\) \{/);
  assert.match(layout, /reset\(\);\s*\n\s*hydrateGuest\(\);/, "and the reset runs before the guest list is read");
});

test("the toggle is on the card and on the detail page", () => {
  assert.match(strip(read("components/ProductCard.jsx")), /<WishlistButton\s+product=\{product\}/);
  assert.match(strip(read("components/product/BuyPanel.jsx")), /<WishlistButton product=\{product\} variant="button"/);
});

test("it stands down only where it would not fit, and nowhere else", () => {
  // The home strip runs four cards across a phone at the client's request, so
  // each is 83px — a 44px button is half its width and the badge beside it is
  // clipped by the card edge. Both return at `sm`, and the catalogue card,
  // which is never that narrow, keeps them at every width.
  const card = strip(read("components/ProductCard.jsx"));

  assert.match(card, /compact && "hidden sm:grid"/, "the heart");
  assert.match(card, /compact && "hidden sm:inline-block"/, "and the badge");

  // `compact` is the home carousel only. If this ever became unconditional it
  // would take the wishlist off `/products` too.
  assert.match(card, /const compact = variant === "compact";/);
});

test("saving a product from a card does not navigate to it", () => {
  // The card wraps everything in a link with `after:inset-0`, so a click on the
  // heart would otherwise follow it.
  const button = strip(read("components/wishlist/WishlistButton.jsx"));

  assert.match(button, /event\.preventDefault\(\);/);
  assert.match(button, /event\.stopPropagation\(\);/);
  assert.match(button, /relative z-10 grid size-11/, "and it sits above the stretched link");
});

test("the toggle is one control with two states, not two labels", () => {
  const button = strip(read("components/wishlist/WishlistButton.jsx"));

  assert.match(button, /aria-pressed=\{saved\}/);
  assert.match(button, /saved \? "Saved to your wishlist" : "Save to your wishlist"/);
});

test("the wishlist page is routed and asks for a sign-in rather than showing nothing", () => {
  const page = strip(read("pages/WishlistPage.jsx"));

  assert.match(strip(read("routes/router.jsx")), /path: "\/wishlist", element: <WishlistPage \/>/);
  assert.match(page, /<SignInPanel/);
  assert.match(page, /kept on this device and added to your account/);
});

test("the page offers the remove and the enquiry shortcut the scope asks for", () => {
  const page = strip(read("pages/WishlistPage.jsx"));

  assert.match(page, /Remove \$\{product\.name\} from your wishlist/);
  assert.match(page, /Enquire about this/);
});
