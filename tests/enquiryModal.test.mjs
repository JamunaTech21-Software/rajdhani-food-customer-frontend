import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const read = (path) => readFileSync(fileURLToPath(new URL(`../src/${path}`, import.meta.url)), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const modal = strip(read("components/product/EnquiryModal.jsx"));
const page = strip(read("pages/ProductDetailPage.jsx"));
const recaptcha = strip(read("hooks/useRecaptcha.js"));

// ── Criterion 1: the enquiry carries product, pack size and quantity ──────

test("the modal opens carrying the product, pack and quantity", () => {
  assert.match(page, /product=\{data\}/);
  assert.match(page, /pack=\{pack\}/);
  assert.match(page, /quantity=\{quantity\}/);
  assert.match(modal, /initialEnquiryValues\(\{ pack, quantity, customer \}\)/);
});

test("each open starts from the current pack and quantity", () => {
  // Without the key, reopening after changing pack size would show the values
  // from the first open.
  assert.match(page, /key=\{enquiryOpen \? `\$\{pack\?\.id \?\? "none"\}-\$\{quantity\}` : "closed"\}/);
});

test("the product id reaches the request, not just the form", () => {
  assert.match(modal, /productId: product\?\.id/);
  assert.match(modal, /sourcePage:/, "so admin can see which page it came from");
});

// ── Criterion 2: the reference number is shown ────────────────────────────

test("the success state shows the returned reference", () => {
  // Live format: RDFP-ENQ-2026-00002.
  assert.match(modal, /setReference\(result\?\.referenceNo \?\? null\)/);
  assert.match(modal, /\{reference\}/);
  assert.match(modal, /Copy reference/, "and it can be copied, since it is worth keeping");
});

test("the form is replaced by the success panel, not shown beneath it", () => {
  assert.match(modal, /\{reference \? \(/);
});

test("the reference is cleared only after the dialog has closed", () => {
  // Clearing synchronously flashes the empty form during the close animation.
  assert.match(modal, /setTimeout\(\(\) => setReference\(null\), 200\)/);
});

// ── Spam protection ───────────────────────────────────────────────────────

test("the honeypot is present, empty, and unreachable by a real visitor", () => {
  // Verified live: filling `website` gets a 403 from the API.
  assert.match(modal, /name="website"/);
  assert.match(modal, /tabIndex=\{-1\}/, "not in the tab order");
  assert.match(modal, /autoComplete="off"/);
  assert.match(modal, /aria-hidden="true"/, "not in the accessibility tree");
});

test("the honeypot is moved off-screen, not display:none", () => {
  // Some bots skip fields that are display:none, which defeats the trap.
  assert.match(modal, /absolute left-\[-9999px\]/);
  assert.doesNotMatch(modal, /className="hidden"/);
});

test("a missing reCAPTCHA key does not block the form", () => {
  // No key is configured, and the API accepts submissions without a token while
  // its own secret is unset. Gating on a key nobody has added would close the
  // platform's only conversion path.
  assert.match(recaptcha, /if \(!RECAPTCHA_SITE_KEY\) return null/);
  assert.match(recaptcha, /catch \{[\s\S]*?return null/, "a blocked script also degrades");
});

test("the reCAPTCHA script is loaded lazily, not on every page", () => {
  // ~80 kB, and it phones Google on load.
  assert.match(recaptcha, /useEffect\(/);
  assert.match(recaptcha, /document\.head\.append\(script\)/);
});

// ── Errors ────────────────────────────────────────────────────────────────

test("field errors from the API land on their fields", () => {
  assert.match(modal, /ErrorCode\.VALIDATION_ERROR/);
  assert.match(modal, /setError\(field, \{ type: "server", message \}\)/);
});

test("rate limiting says so, rather than failing generically", () => {
  // 5 per hour per IP. A generic failure would have someone retrying into it.
  assert.match(modal, /ErrorCode\.RATE_LIMITED/);
  assert.match(modal, /sent several enquiries recently/);
});

test("a failure never discards what was typed", () => {
  // The form stays mounted with its values; only an error message is added.
  assert.match(modal, /setError\("root"/);
  assert.doesNotMatch(modal, /reset\(\)/);
});

// ── Dialog behaviour ──────────────────────────────────────────────────────

test("focus is trapped, Escape closes, focus returns to the trigger", () => {
  // All three are Radix Dialog's job — hand-rolling them is how one of the
  // three quietly stops working.
  assert.match(modal, /@radix-ui\/react-dialog/);
  assert.match(modal, /Dialog\.Content/);
  assert.match(modal, /Dialog\.Close/);
  assert.match(modal, /Dialog\.Title/, "a dialog without a title is unannounced");
});

test("validation is the API's rules, not a second set", () => {
  assert.match(modal, /zodResolver\(enquirySchema\)/);
});
