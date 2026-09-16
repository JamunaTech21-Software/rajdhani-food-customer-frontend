import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { fetchLayout } from "../src/lib/fetchLayout.js";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const stub = (handler) => {
  globalThis.fetch = handler;
};

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

test("a good response yields the envelope's data, not the envelope", () => {
  stub(async () => jsonResponse({ success: true, data: { site: { name: "Rajdhani" } } }));

  return fetchLayout("https://api.example/v1").then((layout) => {
    assert.equal(layout.site.name, "Rajdhani");
    assert.ok(!("success" in layout), "the wrapper is unwrapped (§9.1)");
  });
});

test("the URL is built from the base it is given", async () => {
  let called = null;
  stub(async (url) => {
    called = url;
    return jsonResponse({ success: true, data: {} });
  });

  await fetchLayout("https://api.example/v1");
  assert.equal(called, "https://api.example/v1/public/layout");
});

test("a non-2xx rejects, so the boot reaches its fallback", async () => {
  for (const status of [404, 500, 503]) {
    stub(async () => jsonResponse({ success: false }, status));
    await assert.rejects(() => fetchLayout("https://api.example/v1"), new RegExp(String(status)));
  }
});

test("a 200 carrying success:false still rejects", async () => {
  // The §9.1 envelope reports application errors inside a 200. Trusting the
  // status code alone would hand the store an undefined site and call it ready.
  stub(async () => jsonResponse({ success: false, error: { code: "INTERNAL_ERROR", message: "Database unavailable" } }));

  await assert.rejects(() => fetchLayout("https://api.example/v1"), /Database unavailable/);
});

test("a success:false with no message still rejects with something usable", async () => {
  stub(async () => jsonResponse({ success: false }));
  await assert.rejects(() => fetchLayout("https://api.example/v1"), /unsuccessful/);
});

test("an unreachable host rejects rather than hanging", async () => {
  stub(async () => {
    throw new TypeError("fetch failed");
  });

  await assert.rejects(() => fetchLayout("https://api.example/v1"), /fetch failed/);
});

test("an abort propagates, so the timeout actually stops the request", async () => {
  const controller = new AbortController();
  stub(async (_url, { signal }) => {
    controller.abort();
    if (signal.aborted) throw new DOMException("The operation was aborted.", "AbortError");
    return jsonResponse({ success: true, data: {} });
  });

  await assert.rejects(() => fetchLayout("https://api.example/v1", { signal: controller.signal }));
});

test("malformed JSON rejects instead of returning garbage", async () => {
  stub(async () => new Response("<html>502 Bad Gateway</html>", { status: 200 }));

  // A proxy returning an HTML error page with a 200 is a real shape on shared
  // hosting, and JSON.parse is what catches it.
  await assert.rejects(() => fetchLayout("https://api.example/v1"));
});

test("the live API answers the shape the boot expects", { skip: !process.env.RAJDHANI_API }, async () => {
  // Opt-in, so the suite stays offline by default: RAJDHANI_API=… npm test
  const layout = await fetchLayout(process.env.RAJDHANI_API);

  assert.ok(layout.site?.theme?.primary, "no primary colour to theme from");
  assert.ok(layout.menus, "no menus for the header and footer");
  assert.ok(Array.isArray(layout.social));
});
