import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { formatDate, toDate } from "../src/lib/format.js";

const read = (path) => readFileSync(fileURLToPath(new URL(`../src/${path}`, import.meta.url)), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const form = strip(read("components/dealer/ApplicationForm.jsx"));
const modal = strip(read("components/dealer/SuccessModal.jsx"));
const hooks = strip(read("hooks/useLocations.js"));
const page = strip(read("pages/DealerPage.jsx"));
const router = strip(read("routes/router.jsx"));

test("the page is reachable at /dealer", () => {
  // The DEALER_CTA banner's own CTA points at /dealer, so this has to match.
  assert.match(router, /path: "\/dealer", element: <DealerPage \/>/);
});

// ── Criterion 1: the dependent upazila select ─────────────────────────────

test("changing district clears the previous upazila", () => {
  assert.match(form, /setValue\("upazila_id", ""/);
});

test("the upazila query is keyed on the district", () => {
  // This is what makes it correct under fast switching: each district's list is
  // its own cache entry, so a slow response for one cannot arrive after another
  // was picked and overwrite it.
  assert.match(hooks, /queryKey: \["public", "upazilas", districtId\]/);
  assert.match(hooks, /enabled: Boolean\(districtId\)/);
});

test("the upazila select is disabled until a district is chosen", () => {
  // An enabled empty select invites a click that does nothing.
  assert.match(form, /disabled=\{!districtId \|\| upazilas\.isPending\}/);
  assert.match(form, /Choose a district first/);
});

test("districts are grouped by division in the markup", () => {
  // 64 in one flat list is a scroll; the live data has 8 divisions.
  assert.match(form, /<optgroup key=\{group\.division\}/);
});

// ── Criterion 2: the success modal ────────────────────────────────────────

test("the modal shows all three fields the design calls for", () => {
  // Application ID, submission date and time, expected response window — all
  // from DealerApplicationSubmissionResult, which the backend shaped for this
  // panel. Nothing is composed from elsewhere, so it cannot disagree with what
  // was recorded.
  assert.match(modal, /result\.applicationId/);
  assert.match(modal, /result\.submittedAt/);
  assert.match(modal, /result\.expectedResponseWindow/);
});

test("the submission time survives the API's date format", () => {
  // Live: "2026-09-16 06:35:25.858" — space-separated, which new Date() parses
  // in V8 and rejects in Safari. The modal would read "—" on every iPhone.
  assert.match(modal, /toDate\(result\.submittedAt\)/);

  assert.ok(toDate("2026-09-16 06:35:25.858") instanceof Date);
  assert.equal(formatDate("2026-09-16 06:35:25.858"), "16 Sept 2026");
});

test("the response window is shown only when the API sends one", () => {
  // It is an admin-configurable setting; an empty one should leave a gap rather
  // than an empty row promising nothing.
  assert.match(modal, /\{result\.expectedResponseWindow \? \(/);
});

test("the modal offers both actions the design shows", () => {
  assert.match(modal, /Back to Home/);
  assert.match(modal, /\{brochure \? \(/, "the brochure appears only when it resolves");
});

test("the application ID can be copied", () => {
  // It is the reference someone quotes back; it should not need transcribing.
  assert.match(modal, /aria-label="Copy application ID"/);
});

test("the modal is a dialog, so focus is handled", () => {
  assert.match(modal, /Dialog\.Content/);
  assert.match(modal, /Dialog\.Title/);
});

// ── Spam protection and errors ────────────────────────────────────────────

test("the honeypot matches the enquiry form's", () => {
  // Same field name the API checks, same off-screen treatment.
  assert.match(form, /name="website"/);
  assert.match(form, /tabIndex=\{-1\}/);
  assert.match(form, /absolute left-\[-9999px\]/);
});

test("reCAPTCHA is requested for this form's own action", () => {
  // The API verifies the action name, so an enquiry token would not do.
  assert.match(form, /useRecaptcha\("dealer_application"\)/);
});

test("rate limiting and field errors are handled distinctly", () => {
  assert.match(form, /ErrorCode\.RATE_LIMITED/);
  assert.match(form, /ErrorCode\.VALIDATION_ERROR/);
  assert.match(form, /setError\(field, \{ type: "server", message \}\)/);
});

// ── What is not built ─────────────────────────────────────────────────────

test("no page copy is hardcoded in place of missing content", () => {
  // Four sections have no public data source. Hardcoding their copy would put
  // content in the bundle and take it out of the editors' hands — the opposite
  // of §18.2 — so they are absent until the data is served.
  for (const copy of ["Why Partner With Us", "High Quality Products", "Valid Trade License", "Districts Covered"]) {
    assert.ok(!page.includes(copy), `"${copy}" is hardcoded rather than content-driven`);
  }
});

// ── The comp's six sections ───────────────────────────────────────────────

const dealerPage = strip(read("pages/DealerPage.jsx"));

test("every section the comp draws reads its own source", () => {
  // Five of the six did not exist: the page was a hero and a form, and its
  // docstring said the endpoints were not public yet. They are — RTPP-67
  // shipped `feature-items`, `process-steps` and `stats` — so the sections are
  // built and each is wired to the resource the admin already edits.
  assert.match(dealerPage, /placement: "DEALER_HERO"/);
  assert.match(dealerPage, /usePageBlocks\(PAGE_KEYS\.dealer\)/);
  assert.match(dealerPage, /useFeatureItems\("DEALER_BENEFITS"\)/);
  assert.match(dealerPage, /useProcessSteps\("BECOME_DEALER"\)/);
  assert.match(dealerPage, /useStats\("DEALER_NETWORK"\)/);

  // `includes` rather than a regex: the needle has parentheses in it, and an
  // escape that collapses turns them into a capture group that matches
  // something else entirely.
  for (const key of ["intro", "network", "requirements", "build_future"]) {
    assert.ok(dealerPage.includes(`blockFor(all, "${key}")`), `${key} is read`);
  }
});

test("the page hero is the shared one, not a second copy of it", () => {
  // It used to define its own, with a flat `bg-ink` scrim at whatever opacity
  // an editor set and no floor under it — where `PageHero` holds 0.85 and
  // turns the wash into a gradient only at `lg`. Two heroes is two places for
  // that guard to be missing from.
  assert.match(dealerPage, /<PageHero/);
  assert.doesNotMatch(dealerPage, /function Hero\(/);
});

test("the map is decoration, and no dealer address is plotted on it", () => {
  // There is no coordinate on any dealer or location resource: the only
  // latitude/longitude in the API is the company's own office, on
  // SiteSettings. `dealer_applications` rows are applicants — some rejected —
  // and are never public. So the map is an editor's image on the `network`
  // block, drawn aria-hidden, and nothing here reads an address.
  const network = strip(read("components/dealer/DistributionNetwork.jsx"));

  assert.match(network, /block\?\.image/, "the map comes from the block, not an asset in the bundle");
  assert.match(network, /aria-hidden="true"/);
  assert.doesNotMatch(network, /latitude|longitude|marker|pin|address/i);
});

test("the application form and its dependent dropdowns are untouched", () => {
  // The page was rebuilt around this form; it was not rebuilt.
  assert.match(dealerPage, /<ApplicationForm onSuccess=\{setResult\} \/>/);
  assert.match(dealerPage, /<DealerSuccessModal/);
  assert.match(form, /districts/);
  assert.match(form, /upazila/i);
});
