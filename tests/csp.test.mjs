import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { contentSecurityPolicy, cspDirectives, originOf } from "../csp.js";

const read = (path) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");

const API = "https://api.rajdhanifood.com/api/v1";
const directives = (options) => cspDirectives(options);

// ── Criterion 2: the map embed is not blocked ─────────────────────────────

test("the map's own directive is present", () => {
  // The whole criterion. Without frame-src, the contact page's iframe is
  // blocked — and blocked by CSP means an empty box with nothing on the page
  // to say why.
  assert.ok(directives()["frame-src"].includes("https://www.google.com"));
  assert.ok(directives()["frame-src"].includes("https://maps.google.com"));
});

test("frame-src is a directive of its own, not left to default-src", () => {
  // default-src is 'self'. An iframe falls back to it when frame-src is absent,
  // so "we have a CSP" and "the map works" are not the same statement.
  const policy = contentSecurityPolicy({ apiOrigin: originOf(API) });

  assert.match(policy, /frame-src [^;]*https:\/\/www\.google\.com/);
  assert.equal(directives()["default-src"].includes("https://www.google.com"), false);
});

test("the banner video modal is framed from the same policy", () => {
  // toEmbedUrl() rewrites every YouTube link to youtube-nocookie.com.
  assert.ok(directives()["frame-src"].includes("https://www.youtube-nocookie.com"));
});

// ── The rest of §14.2's list ──────────────────────────────────────────────

test("Cloudinary, Google Fonts and reCAPTCHA are all allowed", () => {
  const d = directives();

  assert.ok(d["img-src"].includes("https://res.cloudinary.com"), "every image on the site");
  assert.ok(d["font-src"].includes("https://fonts.gstatic.com"), "the font files");
  assert.ok(d["style-src"].includes("https://fonts.googleapis.com"), "and the stylesheet that names them");
  assert.ok(d["script-src"].includes("https://www.google.com"), "reCAPTCHA v3");
  assert.ok(d["script-src"].includes("https://www.gstatic.com"));
});

test("inline styles are allowed, because the theme is applied as one", () => {
  // §18.2: site_profile colours become CSS custom properties, and components
  // set style={{…}} from data. Without 'unsafe-inline' in style-src the site
  // renders unthemed — which is the failure this whole rule exists to prevent.
  assert.ok(directives()["style-src"].includes("'unsafe-inline'"));
});

test("the API origin is what reaches connect-src, not the base URL", () => {
  // A path in a source expression matches nothing, and a connect-src that
  // matches nothing blocks every request the app makes.
  const d = directives({ apiOrigin: originOf(API) });

  assert.ok(d["connect-src"].includes("https://api.rajdhanifood.com"));
  assert.equal(d["connect-src"].includes(API), false);
});

test("an unset or unparseable API base URL leaves connect-src without one", () => {
  // Rather than emitting "undefined" as a source, which is a parse error the
  // browser answers by ignoring the directive.
  assert.equal(originOf(undefined), null);
  assert.equal(originOf("localhost:8000"), null);

  const d = directives({ apiOrigin: null });
  assert.deepEqual(d["connect-src"], ["'self'", "https://www.google.com", "https://www.gstatic.com"]);
});

test("a tunnel origin is carried through, because development uses one", () => {
  const d = directives({ apiOrigin: originOf("https://x-y-z.trycloudflare.com/api/v1") });
  assert.ok(d["connect-src"].includes("https://x-y-z.trycloudflare.com"));
});

test("the dangerous defaults are closed", () => {
  const d = directives();

  assert.deepEqual(d["object-src"], ["'none'"]);
  assert.deepEqual(d["base-uri"], ["'self'"]);
  assert.deepEqual(d["form-action"], ["'self'"]);
  assert.equal(d["script-src"].includes("'unsafe-inline'"), false, "no inline scripts in built output");
  assert.equal(d["script-src"].includes("'unsafe-eval'"), false);
});

test("the policy serialises as one header value", () => {
  const policy = contentSecurityPolicy({ apiOrigin: originOf(API) });

  assert.equal(policy.includes("\n"), false);
  assert.equal(policy.split("; ").length, Object.keys(directives()).length);
  assert.match(policy, /^default-src 'self'; /);
});

test("no source is listed twice", () => {
  for (const [directive, sources] of Object.entries(directives({ apiOrigin: "https://www.google.com" }))) {
    assert.equal(new Set(sources).size, sources.length, `${directive} repeats a source`);
  }
});

// ── Wiring ────────────────────────────────────────────────────────────────

test("the build injects the policy, and the dev server does not", () => {
  // The dev server's React refresh preamble is an inline script; a policy loose
  // enough to allow it proves nothing about the one that ships.
  const config = read("vite.config.js");

  assert.match(config, /apply: "build"/);
  assert.match(config, /http-equiv="Content-Security-Policy"/);
  assert.match(config, /cspMeta\(api\?\.value\)/, "and it is actually registered as a plugin");
});

test("the injection fails the build rather than silently placing nothing", () => {
  // It anchors on the viewport meta tag. If index.html is reworded, a missing
  // anchor must not mean a page shipped with no policy at all.
  assert.match(read("vite.config.js"), /throw new Error\("csp: the viewport meta tag was not found/);
  assert.ok(read("index.html").includes('<meta name="viewport" content="width=device-width, initial-scale=1.0" />'));
});

test("frame-ancestors is also sent as a real header", () => {
  // A meta tag cannot set frame-ancestors — the directive is ignored there —
  // so clickjacking protection has to come from the host config.
  const vercel = JSON.parse(read("vercel.json"));
  const headers = vercel.headers.flatMap((entry) => entry.headers).map((header) => header.key);

  assert.ok(headers.includes("X-Frame-Options"));
  assert.ok(headers.includes("X-Content-Type-Options"));
  assert.ok(headers.includes("Referrer-Policy"));
});

test("the public site is not told to keep itself out of search results", () => {
  // The dashboard's config carries X-Robots-Tag: noindex. Copying that file
  // wholesale to the public site would be the quiet end of §14.3.
  const headers = JSON.parse(read("vercel.json")).headers.flatMap((entry) => entry.headers);

  assert.equal(headers.some((header) => header.key === "X-Robots-Tag"), false);
});

test("deep links resolve to the SPA shell", () => {
  // /contact is a client route. Without the rewrite it is a 404 from the host.
  const vercel = JSON.parse(read("vercel.json"));

  assert.deepEqual(vercel.rewrites, [{ source: "/(.*)", destination: "/index.html" }]);
});
