import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { combineState, FAILURE_COPY, failureKind, retryFailed } from "../src/lib/loadState.js";

const read = (path) => readFileSync(fileURLToPath(new URL(`../src/${path}`, import.meta.url)), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const router = strip(read("routes/router.jsx"));
const layout = strip(read("components/layout/SiteLayout.jsx"));
const boundary = strip(read("components/state/ErrorBoundary.jsx"));
const routeError = strip(read("pages/RouteErrorPage.jsx"));
const notFound = strip(read("pages/NotFoundPage.jsx"));
const panel = strip(read("components/state/StatePanel.jsx"));
const sections = strip(read("components/state/PageSections.jsx"));
const home = strip(read("pages/HomePage.jsx"));

const ok = { isPending: false, isError: false };
const pending = { isPending: true, isError: false };
const failed = { isPending: false, isError: true };

// ── "Nothing yet" is not "nothing ever" ───────────────────────────────────

test("nothing to show and nothing failed is empty, not an error", () => {
  // The second acceptance criterion: a brand-new brand with no content. Telling
  // them the site is down sends someone hunting a fault that is not there.
  assert.equal(combineState([ok, ok], { hasContent: false }), "empty");
});

test("nothing to show and something failed is an error, not empty", () => {
  // The first: with the API stopped, a branded error. Saying "nothing here yet"
  // during an outage hides the outage.
  assert.equal(combineState([ok, failed], { hasContent: false }), "error");
  assert.equal(combineState([failed, failed], { hasContent: false }), "error");
});

test("a partial failure with nothing to show is still an error", () => {
  // One request out of four failing is an outage from where the visitor sits,
  // and a retry button is more use than "this page is intentionally blank".
  assert.equal(combineState([ok, ok, ok, failed], { hasContent: false }), "error");
});

test("content that did arrive wins over a decoration that did not", () => {
  // A page whose hero banner failed but whose body loaded is a page, not an
  // apology for a banner the visitor never saw.
  assert.equal(combineState([ok, failed], { hasContent: true }), "ready");
});

test("loading beats a failure beside it", () => {
  // A retry offered while another request is still in flight invites a second
  // click that cancels the first.
  assert.equal(combineState([pending, failed], { hasContent: false }), "loading");
  assert.equal(combineState([pending, ok], { hasContent: true }), "loading");
});

test("no queries at all is empty rather than a crash", () => {
  assert.equal(combineState([]), "empty");
  assert.equal(combineState(), "empty");
  assert.equal(combineState([null, undefined, ok]), "empty");
});

test("one query may be passed without wrapping it in an array", () => {
  assert.equal(combineState(failed), "error");
});

test("only the failed queries are retried", () => {
  // Refetching the ones that worked throws away good data on a slow
  // connection — and the news article counts a view on every request.
  const calls = [];
  const query = (isError, id) => ({ isError, refetch: () => calls.push(id) });

  retryFailed([query(false, "good"), query(true, "bad"), null, query(true, "worse")]);

  assert.deepEqual(calls, ["bad", "worse"]);
});

test("a query with no refetch does not take the retry down", () => {
  assert.doesNotThrow(() => retryFailed([{ isError: true }]));
});

// ── What the failure was ──────────────────────────────────────────────────

test("offline is named as offline, and only when the browser is sure", () => {
  // navigator.onLine is trustworthy when false and a guess when true.
  assert.equal(failureKind(new Error("fetch failed"), { online: false }), "offline");
  assert.equal(failureKind({ status: 500 }, { online: false }), "offline");
  assert.equal(failureKind({ status: 500 }, { online: true }), "server");
});

test("a 404 offers no retry, because retrying cannot help", () => {
  assert.equal(failureKind({ status: 404 }), "notFound");
  assert.equal(FAILURE_COPY.notFound.retry, false);
  assert.equal(FAILURE_COPY.server.retry, true);
  assert.equal(FAILURE_COPY.offline.retry, true);
});

test("a rate limit says to wait rather than blaming the site", () => {
  assert.equal(failureKind({ status: 429 }), "rateLimited");
});

test("a network error with no status is treated as ours", () => {
  // `fetch` rejecting carries no status at all, which is the commonest failure
  // when the API is simply not running.
  assert.equal(failureKind(new Error("Failed to fetch")), "server");
  assert.equal(failureKind(null), "server");
  assert.equal(failureKind({ status: "weird" }), "server");
});

test("every kind has copy, and every piece of copy is a sentence", () => {
  for (const key of ["offline", "notFound", "rateLimited", "server"]) {
    const copy = FAILURE_COPY[key];
    assert.ok(copy.title && !copy.title.endsWith("."), `${key} title`);
    assert.match(copy.body, /\.$/, `${key} body`);
  }
});

// ── Criterion: no white screens ───────────────────────────────────────────

test("a render error no longer unmounts the whole application", () => {
  // React's answer to an uncaught render error is to tear down the entire
  // tree — header, footer and all — leaving a white page with no way back.
  assert.match(boundary, /static getDerivedStateFromError/);
  assert.match(boundary, /componentDidCatch/);
  assert.match(boundary, /extends Component/);
});

test("the boundary is around the page, not around the whole app", () => {
  // So the header and footer — the only way out — survive a page that throws.
  assert.match(layout, /<ErrorBoundary key=\{pathname\} name="page">\s*<Outlet \/>\s*<\/ErrorBoundary>/);
});

test("the boundary is keyed on the path, so an error does not follow you", () => {
  // Without the key, a boundary that has caught stays caught: every subsequent
  // navigation renders the fallback and the whole site looks broken.
  assert.match(layout, /key=\{pathname\}/);
});

test("the router has a last-resort error element", () => {
  // For when the chrome itself threw, which the boundary inside it cannot
  // catch — it is below the thing that failed.
  assert.match(router, /errorElement: <RouteErrorPage \/>/);
});

test("the error page depends on nothing that could be the thing that broke", () => {
  // It renders during a total outage. Pulling in the layout, the site store or
  // the SEO hook is how you get a second error inside the error page.
  for (const forbidden of ["SiteLayout", "siteStore", "useSeo", "PageState"]) {
    assert.doesNotMatch(routeError, new RegExp(forbidden), `imports ${forbidden}`);
  }
});

test("the error page reloads rather than re-rendering", () => {
  // By the time it shows, React has torn the tree down; re-rendering walks
  // straight back into the same error.
  assert.match(routeError, /window\.location\.reload\(\)/);
  assert.match(routeError, /<a href="\/"/, "a plain anchor, not a Link through the broken router");
});

test("a raw error message is shown in development only", () => {
  assert.match(routeError, /IS_DEV \?/);
  assert.doesNotMatch(routeError, /import\.meta\.env/, "config.js owns that read");
});

// ── Criterion: a 404 that is a page ───────────────────────────────────────

test("an unmatched URL has somewhere to land", () => {
  // Until now there was no catch-all at all: a mistyped path rendered the
  // layout around an empty <main>.
  assert.match(router, /\{ path: "\*", element: <NotFoundPage \/> \}/);
});

test("the catch-all is last, or it would swallow the routes below it", () => {
  const routes = [...router.matchAll(/path: "([^"]+)"/g)].map((m) => m[1]);

  assert.equal(routes.at(-1), "*");
  assert.equal(routes.filter((p) => p === "*").length, 1);
});

test("the 404 keeps the header and footer, and offers a way out", () => {
  // It is a child of the layout route, not a replacement for it — the nav is
  // the way out, and a visitor arriving from outside has no Back to press.
  assert.match(notFound, /to="\/"/);
  assert.match(notFound, /to="\/products"/);
  assert.match(notFound, /noindex: true/);
});

test("the 404 names the path that was not found", () => {
  assert.match(notFound, /\{pathname\}/);
  assert.match(notFound, /break-all/, "so a long path cannot widen the page");
});

// ── Criterion: one failing section does not blank the page ────────────────

test("each home band is wrapped on its own", () => {
  // They all come from one payload, so one field of the wrong shape would
  // otherwise take the whole home page down.
  assert.match(home, /<ErrorBoundary key=\{name\} name=\{`home:\$\{name\}`\} title=\{label\}>/);

  const names = [...home.matchAll(/^\s*(?:\{ )?name: "(\w+)",/gm)].map((m) => m[1]);
  assert.deepEqual(names, [
    "hero",
    "usp",
    "featured",
    "about",
    "process",
    "dealer",
    "voices",
  ]);
});

test("a failed band says which band it was", () => {
  // "Featured teas could not be shown" tells a visitor what they are missing;
  // "something went wrong" leaves them wondering.
  assert.match(home, /label: "Featured teas could not be shown"/);
  assert.match(home, /label: "Our process could not be shown"/);
});

test("merging two bands into one row did not merge their boundaries", () => {
  // H7 put the testimonials and the news in a single grid. One boundary around
  // both would mean a bug in a news cover taking the quotes down with it —
  // exactly what RTPP-72 added them to prevent.
  const voices = strip(read("components/home/VoicesBand.jsx"));

  assert.match(voices, /name="home:testimonials" title="Customer reviews could not be shown" inline/);
  assert.match(voices, /name="home:news" title="Latest updates could not be shown" inline/);
});

test("a boundary inside a laid-out column does not add the gutters twice", () => {
  assert.match(boundary, /if \(this\.props\.inline\) return panel;/);
});

test("every optional home band disappears rather than drawing an empty one", () => {
  // The other half of "a brand-new brand renders every page without breaking".
  for (const band of [
    "FeaturedProducts",
    "Testimonials",
    "LatestNews",
    "StatsBand",
    "UspStrip",
    "WelcomeBlock",
    "Hero",
  ]) {
    assert.match(strip(read(`components/home/${band}.jsx`)), /return null/, band);
  }
});

// ── Wording ───────────────────────────────────────────────────────────────

test("an empty state is not announced as an alert, an error is", () => {
  // A catalogue nobody has filled in yet is the expected state of a new brand,
  // not something to interrupt a screen-reader user about.
  const empty = panel.slice(panel.indexOf("export function EmptyState"), panel.indexOf("export function ErrorState"));

  assert.doesNotMatch(empty, /role="alert"/);
  assert.match(panel.slice(panel.indexOf("export function ErrorState")), /role="alert"/);
});

test("an empty state always offers a way out", () => {
  assert.match(sections, /Get in touch/);
  assert.match(sections, /to="\/contact"/);
});

test("the legal pages tell an outage apart from an unwritten policy", () => {
  // "This page has not been published yet" during an outage says the company
  // has no privacy policy, which is a very different statement.
  const legal = strip(read("pages/LegalPage.jsx"));

  assert.ok(
    legal.indexOf("blocks.isError") < legal.indexOf("This page has not been published yet"),
    "the error branch must come first",
  );
});

test("the contact card does not vanish and leave half a layout", () => {
  const details = strip(read("components/contact/ContactDetails.jsx"));

  assert.doesNotMatch(details, /if \(rows\.length === 0\) return null;/);
  assert.match(details, /The form below still reaches us/);
});

test("the content pages distinguish their two empty endings", () => {
  for (const page of ["AboutPage", "QualityPage"]) {
    const source = strip(read(`pages/${page}.jsx`));

    assert.match(source, /combineState\(/, page);
    assert.match(source, /<PageSections/, page);
    assert.match(source, /onRetry=\{\(\) => retryFailed\(content\)\}/, page);
  }
});

test("a detail page tells 'withdrawn' apart from 'we could not reach the API'", () => {
  // Both used to print "It may have been renamed or withdrawn from the
  // catalogue", which during a five-minute outage is a claim about the product
  // that is simply untrue — and it offered no retry, because a real 404 has
  // nothing to retry.
  for (const [page, gone, down] of [
    ["ProductDetailPage", "We could not find that product", "We could not load that product"],
    ["NewsArticlePage", "We could not find that article", "We could not load that article"],
  ]) {
    const source = strip(read(`pages/${page}.jsx`));

    assert.match(source, /failureKind\((?:product|query)\.error\) === "notFound"/, page);
    assert.ok(source.includes(gone), `${page}: ${gone}`);
    assert.ok(source.includes(down), `${page}: ${down}`);
    assert.match(source, /\{gone \? null : \(/, `${page} offers no retry for a real 404`);
  }
});

test("an empty response is treated as gone, not as an outage", () => {
  // A 200 with no body is the API saying the thing is not there.
  for (const page of ["ProductDetailPage", "NewsArticlePage"]) {
    assert.match(strip(read(`pages/${page}.jsx`)), /!(?:product|query)\.isError && !(?:data|post)/, page);
  }
});

test("the hero is left out of the page state on purpose", () => {
  // A decorative banner that failed must not put an error over a page whose
  // text arrived perfectly.
  for (const page of ["AboutPage", "QualityPage"]) {
    assert.doesNotMatch(strip(read(`pages/${page}.jsx`)), /combineState\(\[hero/, page);
  }
});
