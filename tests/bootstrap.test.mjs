import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { RuleTester } from "eslint";

import { configOnlyEnv } from "../eslint-rules/config-only-env.js";

const read = (path) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");

const strip = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const main = strip(read("src/main.jsx"));
const bootstrap = strip(read("src/lib/bootstrap.js"));
const app = strip(read("src/App.jsx"));

test("the boot starts before React mounts, not in an effect", () => {
  // An effect runs after first paint, so the request would not have left the
  // browser by the time the page is on screen. Ordering is the whole point.
  const bootAt = main.indexOf("bootstrapSite()");
  const rootAt = main.indexOf("createRoot(");

  assert.ok(bootAt > -1, "main.jsx never starts the boot");
  assert.ok(rootAt > -1);
  assert.ok(bootAt < rootAt, "bootstrapSite() must be called before createRoot()");

  assert.doesNotMatch(app, /useEffect/, "App must not re-fetch the layout after paint");
});

test("a second call does not fire a second request", () => {
  // StrictMode double-invokes, and a retry path exists. Two layout requests on
  // every load is a wasted round trip on the critical path.
  assert.match(bootstrap, /if \(inFlight\) return inFlight/);
});

test("a hung request cannot leave the chrome loading forever", () => {
  // Without a timeout the store sits at "loading" indefinitely and every
  // skeleton in the header spins for the life of the page.
  assert.match(bootstrap, /AbortController/);
  assert.match(bootstrap, /setTimeout\(\(\) => controller\.abort\(\), TIMEOUT_MS\)/);
  assert.match(bootstrap, /clearTimeout/, "and the timer is cleared on success");
});

test("every failure path lands in the fallback state", () => {
  // RTPP-57's second criterion: slow or unavailable must still render. A
  // rejected promise that nothing catches would leave status at "loading".
  assert.match(bootstrap, /\.catch\(\(error\) => \{[\s\S]*?setFallback\(error\)/);

  // The throws that must reach that catch live in fetchLayout.js, where they
  // are tested behaviourally rather than by reading source — see
  // fetchLayout.test.mjs, which exercises non-2xx, success:false, an
  // unreachable host, an abort and malformed JSON.
  assert.match(bootstrap, /fetchLayout\(API_BASE_URL/);
});

test("the theme is applied before the store update", () => {
  // The store update triggers a render; doing it first would paint one frame in
  // the old palette.
  const themeAt = bootstrap.indexOf("applyTheme(layout)");
  const storeAt = bootstrap.indexOf("setLayout(layout)");

  assert.ok(themeAt > -1 && storeAt > -1);
  assert.ok(themeAt < storeAt);
});

test("the boot does not depend on React, the query client or a token", () => {
  // It runs before all three exist. /public/layout is public, so a token would
  // be meaningless anyway.
  assert.doesNotMatch(bootstrap, /from "react/);
  assert.doesNotMatch(bootstrap, /queryClient/);
  assert.doesNotMatch(bootstrap, /authStore|accessToken/);
});

test("only config.js may read import.meta.env", () => {
  // RTPP-57's third criterion, enforced rather than reviewed.
  const ruleTester = new RuleTester({
    languageOptions: { ecmaVersion: 2023, sourceType: "module" },
  });

  ruleTester.run("config-only-env", configOnlyEnv, {
    valid: [
      // import.meta on its own is how a module locates itself — unrelated.
      { code: "const here = import.meta.url;", filename: "src/lib/thing.js" },
      { code: "const x = 1;", filename: "src/lib/thing.js" },
      // The one module that is allowed to read it.
      { code: "const a = import.meta.env.VITE_BASE_URL;", filename: "src/config.js" },
    ],
    invalid: [
      {
        code: "const a = import.meta.env.VITE_BASE_URL;",
        filename: "src/lib/api.js",
        errors: [{ messageId: "direct" }],
      },
      {
        code: "const mode = import.meta.env.MODE;",
        filename: "src/components/Thing.jsx",
        errors: [{ messageId: "direct" }],
      },
    ],
  });
});

test("nothing outside config.js reads the environment today", () => {
  // The lint rule enforces this going forward; this asserts the current state,
  // so a failure here names the file rather than only failing the lint run.
  const offenders = [];
  for (const path of ["src/main.jsx", "src/App.jsx", "src/lib/bootstrap.js", "src/lib/api.js", "src/lib/cloudinary.js"]) {
    if (/import\.meta\.env/.test(strip(read(path)))) offenders.push(path);
  }

  assert.deepEqual(offenders, []);
});
