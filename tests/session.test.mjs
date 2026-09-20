import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import {
  EDITABLE_FIELDS,
  greetingName,
  hasProfileChanges,
  initialProfile,
  initials,
  profileUpdate,
  reviewStatus,
  toSession,
} from "../src/lib/session.js";

const read = (path) => readFileSync(fileURLToPath(new URL(`../src/${path}`, import.meta.url)), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// The sign-in payload, in the shape the spec documents.
const PAYLOAD = {
  customer: {
    id: "01M2CYEKM2ND38R5AH2P7ZR3CM",
    name: "Rahim Uddin",
    email: "rahim@example.com",
    avatar_url: "https://lh3.googleusercontent.com/a/x",
    phone: null,
    city: null,
    company_name: null,
  },
  tokens: { access_token: "eyJhbGciOi", expires_in: 900 },
  is_new: true,
};

// ── What counts as a session ──────────────────────────────────────────────

test("a sign-in response becomes a session", () => {
  const session = toSession(PAYLOAD);

  assert.equal(session.accessToken, PAYLOAD.tokens.access_token);
  assert.equal(session.customer.id, PAYLOAD.customer.id);
  assert.equal(session.isNew, true, "so a welcome can be shown once");
});

test("a payload with no access token is not a session", () => {
  // The cookie may still be valid, but nothing can be requested until a refresh
  // returns a token — and treating it as signed in shows an account page that
  // 401s on every query.
  assert.equal(toSession({ customer: PAYLOAD.customer }), null);
  assert.equal(toSession({ customer: PAYLOAD.customer, tokens: {} }), null);
});

test("a token with no customer is not a session either", () => {
  assert.equal(toSession({ tokens: PAYLOAD.tokens }), null);
  assert.equal(toSession({ tokens: PAYLOAD.tokens, customer: {} }), null, "no id is no customer");
});

test("nothing at all is not a session", () => {
  for (const input of [null, undefined, {}, "", 0]) assert.equal(toSession(input), null);
});

test("is_new is only true when the API says so", () => {
  assert.equal(toSession({ ...PAYLOAD, is_new: false }).isNew, false);
  assert.equal(toSession({ ...PAYLOAD, is_new: undefined }).isNew, false);
  assert.equal(toSession({ ...PAYLOAD, is_new: "yes" }).isNew, false, "a truthy string is not true");
});

// ── The profile patch ─────────────────────────────────────────────────────

test("only the three fields the API accepts are sent", () => {
  // Not name or avatar: Google owns those and overwrites them at the next
  // sign-in, so a form offering them would quietly discard what was typed. Not
  // email: it is the identity key.
  const body = profileUpdate({
    phone: "01700000001",
    city: "Dhaka",
    company_name: "Rahim Stores",
    name: "Someone Else",
    email: "attacker@example.com",
    id: "01OTHER",
  });

  assert.deepEqual(Object.keys(body).sort(), [...EDITABLE_FIELDS].sort());
  assert.equal("name" in body, false);
  assert.equal("email" in body, false);
});

test("a blank is sent, not dropped, because a blank clears the field", () => {
  // Omitting a key means "leave it alone". Without this there is no way to
  // remove a phone number once given.
  const body = profileUpdate({ phone: "", city: "  ", company_name: "Rahim Stores" });

  assert.equal(body.phone, "");
  assert.equal(body.city, "");
  assert.equal(body.company_name, "Rahim Stores");
});

test("a field the form does not have is left alone", () => {
  assert.deepEqual(profileUpdate({ phone: "01700000001" }), { phone: "01700000001" });
  assert.deepEqual(profileUpdate({}), {});
  assert.deepEqual(profileUpdate(null), {});
});

test("the form opens with strings, never undefined", () => {
  // A React input flips from uncontrolled to controlled and warns otherwise.
  const values = initialProfile({ phone: null, city: undefined });

  for (const field of EDITABLE_FIELDS) assert.equal(typeof values[field], "string");
  assert.deepEqual(initialProfile(null), { phone: "", city: "", company_name: "" });
});

test("an unchanged form knows it has nothing to save", () => {
  const customer = { phone: "01700000001", city: "Dhaka", company_name: null };

  assert.equal(hasProfileChanges(initialProfile(customer), customer), false);
  assert.equal(hasProfileChanges({ ...initialProfile(customer), city: "Sylhet" }, customer), true);
  // Whitespace either side is not a change worth a request.
  assert.equal(hasProfileChanges({ ...initialProfile(customer), phone: " 01700000001 " }, customer), false);
});

test("clearing a field that had a value is a change", () => {
  const customer = { phone: "01700000001", city: null, company_name: null };
  assert.equal(hasProfileChanges({ ...initialProfile(customer), phone: "" }, customer), true);
});

// ── Small display helpers ─────────────────────────────────────────────────

test("initials fall back through what is actually populated", () => {
  // avatar_url is nullable and the image can fail to load; a grey circle with
  // no initials is indistinguishable from a broken one.
  assert.equal(initials({ name: "Rahim Uddin" }), "RU");
  assert.equal(initials({ name: "Rahim" }), "RA");
  assert.equal(initials({ name: "Rahim Kabir Uddin" }), "RU", "first and last, not the middle");
  assert.equal(initials({ email: "rahim.uddin@example.com" }), "RU");
  assert.equal(initials({}), "?", "never empty — it is the only thing in the circle");
  assert.equal(initials(null), "?");
});

test("someone is greeted by their first name", () => {
  assert.equal(greetingName({ name: "Rahim Uddin" }), "Rahim");
  assert.equal(greetingName({ email: "rahim@example.com" }), "rahim");
  assert.equal(greetingName(null), "there");
});

test("a pending review says so rather than looking lost", () => {
  // Someone who writes a review and finds no trace of it assumes it vanished.
  assert.equal(reviewStatus("PENDING").label, "Awaiting moderation");
  assert.equal(reviewStatus("APPROVED").label, "Published");
  assert.equal(reviewStatus("REJECTED").label, "Not published");
  assert.equal(reviewStatus("SOMETHING_NEW").label, "Unknown", "a new status does not crash the page");
});

// ── Wiring ────────────────────────────────────────────────────────────────

test("the refresh cookie is exchanged at boot, not in an effect", () => {
  // An effect runs after first paint, so the header would show "Sign in" to
  // someone about to be restored as signed in.
  assert.match(strip(read("main.jsx")), /restoreSession\(\);/);
  assert.match(strip(read("lib/restoreSession.js")), /if \(inFlight\) return inFlight;/, "StrictMode double-invokes");
});

test("the restore call does not send a bearer token", () => {
  // With one, the shared client would read the 401 as an expired token and call
  // refresh — from inside refresh.
  const restore = strip(read("lib/restoreSession.js"));

  assert.match(restore, /"\/auth\/customer\/refresh", undefined, \{ auth: false \}/);
  assert.match(restore, /"\/auth\/customer\/logout", undefined, \{ auth: false \}/);
});

test("a 401 anywhere else refreshes once and retries", () => {
  // The shared client is single-flight, so six queries firing at once send one
  // refresh — six would rotate the token family and trip reuse detection.
  const api = strip(read("lib/api.js"));

  assert.match(api, /refreshSession,/);
  assert.match(api, /async function refreshSession\(\)/);
  assert.match(api, /return null;/, "a failed refresh is 'no session', not an error");
});

test("sign-out drops the cookie and the session, even if the request fails", () => {
  const restore = strip(read("lib/restoreSession.js"));

  assert.match(restore, /} finally \{[\s\S]*?useAuthStore\.getState\(\)\.clear\(\);/);
  assert.match(restore, /inFlight = null;/, "so a later sign-in is not served the old promise");
});

test("signing out empties the cache for the next person at this browser", () => {
  const account = strip(read("pages/AccountPage.jsx"));

  assert.match(account, /await signOut\(\);/);
  assert.match(account, /queryClient\.clear\(\);/);
});

test("account queries are keyed by the customer", () => {
  // The second acceptance criterion. Without the id in the key, one person's
  // reviews are served from cache to the next.
  const account = strip(read("pages/AccountPage.jsx"));

  assert.match(account, /queryKey: \["account", "reviews", customer\?\.id\]/);
  assert.match(account, /staleTime: 0/);
});

test("there is no password anywhere on the site", () => {
  // §7.1: no registration endpoint, no reset, no credential to phish or store.
  const panel = strip(read("components/account/SignInPanel.jsx"));

  assert.doesNotMatch(panel, /type="password"|forgot|reset/i);
  assert.match(panel, /useGoogleSignIn/);
});

test("sign-in is hidden rather than broken when no client ID is set", () => {
  // None is configured today. A button that opens a Google dialog reading
  // "invalid client" is worse than an absent one.
  const hook = strip(read("hooks/useGoogleSignIn.js"));

  assert.match(hook, /GOOGLE_CLIENT_ID \? "loading" : "unconfigured"/);
  assert.match(hook, /if \(!GOOGLE_CLIENT_ID\) return Promise\.resolve\(false\)/);
  assert.match(strip(read("components/account/SignInPanel.jsx")), /Sign-in is not switched on yet/);
});

test("a blocked script says so instead of leaving a gap", () => {
  // A privacy extension blocking accounts.google.com looks exactly like an
  // unconfigured client to a visitor: an empty space where a button was.
  assert.match(strip(read("hooks/useGoogleSignIn.js")), /setState\("unavailable"\)/);
  assert.match(strip(read("components/account/SignInPanel.jsx")), /could not load/);
});

test("One Tap is off", () => {
  // An automatic prompt on a catalogue page interrupts someone who came to look
  // at tea, and §18 treats uncontrolled interruption as a failure.
  assert.match(strip(read("hooks/useGoogleSignIn.js")), /auto_select: false/);
});

test("the header holds its space while the session is still unknown", () => {
  // `status` is three-valued so the header can show neither state until the
  // cookie exchange settles, rather than flickering "Sign in" then an avatar.
  const header = strip(read("components/layout/Header.jsx"));

  assert.match(header, /session === "authenticated" \? \(/);
  assert.match(header, /session === "anonymous" \? \(/);
  assert.match(header, /hidden size-11 shrink-0 lg:block/, "the placeholder for 'unknown'");
});

test("Google's own hosts are in the policy", () => {
  // The library, the iframe its button renders in, its XHR, and the avatars.
  const csp = readFileSync(fileURLToPath(new URL("../csp.js", import.meta.url)), "utf8");

  assert.match(csp, /const GOOGLE_IDENTITY = \["https:\/\/accounts\.google\.com"\]/);
  assert.match(csp, /GOOGLE_AVATARS = \["https:\/\/lh3\.googleusercontent\.com"\]/);
});
