import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const read = (path) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");
const json = (path) => JSON.parse(read(path));

/**
 * The deployment contract.
 *
 * None of this fails a build or a lint — it fails on a host, after a push, and
 * usually as a blank page or a silent 404. Each rule below is something that
 * was actually wrong, or that the next edit to these files would make wrong.
 */

test("a deep link resolves to the app rather than a 404", () => {
  // The site is a client-routed SPA. Without the rewrite, opening
  // /products/<slug> directly asks the host for a file that does not exist.
  assert.deepEqual(json("vercel.json").rewrites, [{ source: "/(.*)", destination: "/index.html" }]);
});

test("the public site is not told to keep itself out of search results", () => {
  // The dashboard's config carries X-Robots-Tag: noindex. Copying that file
  // across would be the quiet end of §14.3.
  const headers = json("vercel.json").headers.flatMap((entry) => entry.headers);

  assert.equal(headers.some((header) => header.key === "X-Robots-Tag"), false);
  for (const key of ["X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy"]) {
    assert.ok(headers.some((header) => header.key === key), `${key} is missing`);
  }
});

test("built assets are cached immutably, and nothing else is", () => {
  // Their filenames carry a content hash; index.html must not be cached that
  // way or a deploy never reaches anyone.
  const cached = json("vercel.json").headers.filter((entry) =>
    entry.headers.some((header) => header.key === "Cache-Control"),
  );

  assert.equal(cached.length, 1);
  assert.equal(cached[0].source, "/assets/(.*)");
});

test("the build refuses to ship pointing at localhost", () => {
  // config.js falls back to http://localhost:8000/api/v1, which on a host means
  // every request goes to the visitor's own machine, silently, forever.
  const config = read("vite.config.js");

  assert.match(config, /if \(!api && command === "build" && mode === "production"\)/);
  assert.match(config, /would ship pointing at localhost/);
  assert.match(config, /See DEPLOY\.md/, "and says where to fix it");
});

test("the 161 MB of design references cannot reach a deployment", () => {
  // They lived in the Vite public directory, so every build copied them into
  // dist/: 162 MB of output, of which 712 kB was the site. Two independent
  // guards, because either alone leaves a way back in.
  assert.match(read("vite.config.js"), /publicDir: "static"/);

  const ignored = read(".gitignore");
  assert.match(ignored, /public\/RajdhaniWebsiteReferenceImages\//);
  assert.match(ignored, /public\/RajdhaniPagesRequireImages\//);
});

test("the one asset that does ship is where the build will look for it", () => {
  assert.match(read("static/favicon.svg"), /^<svg/);
  assert.match(read("index.html"), /href="\/favicon\.svg"/);
});

test("the environment is documented where a deployer will find it", () => {
  const example = read(".env.example");

  assert.match(example, /VITE_BASE_URL/);
  assert.match(example, /VITE_SITE_URL/);
  assert.doesNotMatch(example, /RECAPTCHA_SECRET|CLOUDINARY_API_SECRET/, "a secret in a VITE_ file");
  assert.match(read("DEPLOY.md"), /Root Directory → Edit → `frontend\/customer`/, "the monorepo setting");
});

test("the node version is declared, not inferred", () => {
  assert.match(json("package.json").engines.node, /^>=2\d/);
});
