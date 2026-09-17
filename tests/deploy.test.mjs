import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
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
  // `static/` holds exactly what the site serves, and nothing else — which is
  // how `icons.svg` came to sit in a public directory unreferenced for months.
  const served = readdirSync(fileURLToPath(new URL("../static/", import.meta.url)));
  const html = read("index.html");

  assert.deepEqual(served, ["rajdhani-logo.png"]);
  for (const file of served) {
    assert.ok(html.includes(`/${file}`), `static/${file} is served but nothing references it`);
  }
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

test("nothing the browser needs requires the VITE_ prefix", () => {
  // The prefix is a rule about Vite's *automatic* exposure, not about what a
  // build can read — and a host that refuses it must still be able to
  // configure the site. Every value therefore has a short name too.
  //
  // The reCAPTCHA key was the exception until this was written: it had no
  // `define` entry and leaned on the automatic exposure, which happens under
  // the prefix and only under the prefix.
  const config = read("vite.config.js");

  for (const [name, short] of [
    ["API_URL_NAMES", "BASE_URL"],
    ["SITE_URL_NAMES", "SITE_URL"],
    ["RECAPTCHA_NAMES", "RECAPTCHA_SITE_KEY"],
  ]) {
    // Sliced rather than matched: the list is bracketed, and a regex for it
    // needs escapes that do not survive being written by hand.
    const from = config.indexOf(`const ${name} = [`);
    assert.notEqual(from, -1, `${name} is gone`);
    const list = config.slice(from, config.indexOf("]", from));

    assert.ok(list.includes(`"${short}"`), `${name} has no prefix-free spelling`);
  }
});

test("every env value the app reads is mapped at build time", () => {
  // Anything read from `import.meta.env` without a matching `define` works only
  // under the VITE_ prefix, which is the trap this whole arrangement exists to
  // avoid. The two lists have to match exactly.
  // Comments stripped first: `config.js` opens by explaining why the value is
  // not called `BASE_URL`, and the explanation is not a read.
  const source = read("src/config.js")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  const read_ = new Set(
    [...source.matchAll(/import\.meta\.env\.([A-Z0-9_]+)/g)].map((m) => m[1]),
  );
  const defined = new Set(
    [...read("vite.config.js").matchAll(/"import\.meta\.env\.([A-Z0-9_]+)":/g)].map((m) => m[1]),
  );

  assert.deepEqual([...read_].sort(), [...defined].sort());
});

test("the build log accounts for all three, not just the required one", () => {
  // A variable set under a name nothing reads is silent. The log is the only
  // place a deployer can confirm what the build actually saw.
  const config = read("vite.config.js");

  assert.match(config, /\[env\] API base URL from/);
  assert.match(config, /\[env\] site URL from/);
  assert.match(config, /\[env\] reCAPTCHA site key from/);
});
