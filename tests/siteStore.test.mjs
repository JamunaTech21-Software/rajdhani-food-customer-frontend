import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import { menuFor, newsletterEnabled, useSiteStore } from "../src/stores/siteStore.js";

const LAYOUT = {
  site: { name: "Rajdhani Food Products", theme: { primary: "#1B5E20" } },
  menus: {
    header: [{ id: "1", label: "Home", url: "/" }],
    footer_quick: [{ id: "2", label: "About Us", url: "/about" }],
    footer_products: [],
    legal: [{ id: "3", label: "Privacy Policy", url: "/privacy" }],
  },
  social: [{ platform: "facebook", url: "https://facebook.com/x" }],
  newsletter: { enabled: true },
};

beforeEach(() => {
  useSiteStore.setState({
    status: "loading",
    site: null,
    menus: null,
    social: [],
    newsletter: null,
    error: null,
  });
});

test("the store starts loading, not empty", () => {
  // A header cannot tell "no menu yet" from "no menu at all" if the initial
  // state is the same as the failed state — it would flash the fallback chrome
  // on every page load before the real menu arrives.
  assert.equal(useSiteStore.getState().status, "loading");
});

test("a successful layout fills every slice", () => {
  useSiteStore.getState().setLayout(LAYOUT);
  const state = useSiteStore.getState();

  assert.equal(state.status, "ready");
  assert.equal(state.site.name, "Rajdhani Food Products");
  assert.equal(state.menus.header.length, 1);
  assert.equal(state.social.length, 1);
  assert.equal(state.newsletter.enabled, true);
  assert.equal(state.error, null);
});

test("a failed layout is a distinct state, not an empty success", () => {
  // RTPP-57's second criterion. "fallback" tells the chrome to stop waiting and
  // render its minimum; "ready with no menus" would be a lie, and "loading"
  // forever is a permanent skeleton.
  const error = new Error("Network unreachable");
  useSiteStore.getState().setFallback(error);

  const state = useSiteStore.getState();
  assert.equal(state.status, "fallback");
  assert.equal(state.error, error, "the reason is kept, for a retry affordance");
  assert.equal(state.site, null);
});

test("menus read as arrays in all three states", () => {
  // Every consumer would otherwise need its own `?? []`, and the one that
  // forgot would crash the header on a slow connection.
  assert.deepEqual(menuFor("header"), [], "while loading");

  useSiteStore.getState().setFallback(new Error("down"));
  assert.deepEqual(menuFor("header"), [], "after a failure");

  useSiteStore.getState().setLayout(LAYOUT);
  assert.deepEqual(menuFor("header").map((l) => l.label), ["Home"], "when ready");
});

test("a location the payload omits still reads as an array", () => {
  useSiteStore.getState().setLayout({ ...LAYOUT, menus: { header: [] } });

  assert.deepEqual(menuFor("footer_products"), []);
  assert.deepEqual(menuFor("nonsense"), []);
});

test("the newsletter form is off unless the API says on", () => {
  // Defaulting to on would render a subscribe form the backend then refuses.
  assert.equal(newsletterEnabled(), false, "while loading");

  useSiteStore.getState().setFallback(new Error("down"));
  assert.equal(newsletterEnabled(), false, "after a failure");

  useSiteStore.getState().setLayout({ ...LAYOUT, newsletter: { enabled: false } });
  assert.equal(newsletterEnabled(), false);

  useSiteStore.getState().setLayout(LAYOUT);
  assert.equal(newsletterEnabled(), true);
});

test("a malformed payload degrades instead of throwing", () => {
  // A 200 with an unexpected body should not take the page down.
  for (const payload of [null, undefined, {}, { site: null }]) {
    useSiteStore.getState().setLayout(payload);
    assert.equal(useSiteStore.getState().status, "ready");
    assert.deepEqual(menuFor("header"), []);
  }
});
