import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const read = (path) => readFileSync(fileURLToPath(new URL(`../src/${path}`, import.meta.url)), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const page = strip(read("pages/ContactPage.jsx"));
const details = strip(read("components/contact/ContactDetails.jsx"));
const form = strip(read("components/contact/ContactForm.jsx"));
const map = strip(read("components/contact/ContactMap.jsx"));
const hero = strip(read("components/layout/PageHero.jsx"));
const router = strip(read("routes/router.jsx"));

test("the page is routed at the path the API's own menu links to", () => {
  // `menus.header` carries { label: "Contact", url: "/contact" }. Routing it
  // anywhere else leaves a dead link in the header of every page.
  assert.match(router, /path: "\/contact", element: <ContactPage \/>/);
});

// ── Criterion 1: settings reach the page with no deploy ───────────────────

test("nothing on the page is written into it", () => {
  // The card, the pin and the map all read the site store. A phone number in
  // this file would be a number an admin cannot change.
  assert.match(page, /useSiteStore/);
  assert.match(page, /site\?\.contact/);
  assert.match(page, /mapLocation\(site\?\.map/);
  assert.doesNotMatch(page + details + map, /\+880|rajdhanifood\.com|Banani/);
});

test("the address the pin card shows is the address the card shows", () => {
  // Two joins of the same three fields would drift the first time one of them
  // gains a line.
  assert.match(page, /\[contact\?\.address_line, contact\?\.city, contact\?\.country\]\.filter\(Boolean\)/);
  assert.match(page, /<ContactMap location=\{location\} name=\{site\?\.name\} address=\{address\} \/>/);
});

test("the card skeletons while the layout payload is still in flight", () => {
  // §10.5: every async section shows a skeleton rather than a blank screen.
  assert.match(page, /loading=\{status === "loading"\}/);
  assert.match(details, /aria-busy="true"/);
});

test("a contact block that never arrives renders nothing, not an empty card", () => {
  assert.match(details, /if \(rows\.length === 0\) return null;/);
});

// ── Criterion 2: the map embed ────────────────────────────────────────────

test("the map is an iframe with an accessible name", () => {
  // An untitled iframe is announced as "frame", which is nothing.
  assert.match(map, /<iframe/);
  assert.match(map, /title=\{location\.title\}/);
  assert.match(map, /src=\{location\.embedSrc\}/);
});

test("the map frame is lazy, so it is not on the first-paint path", () => {
  assert.match(map, /loading="lazy"/);
});

test("no coordinates means no map panel at all", () => {
  // Not an empty box, and not a view of the Gulf of Guinea.
  assert.match(map, /if \(!location\) return null;/);
  assert.match(page, /\{location \? \(/);
});

test("the pin card does not swallow the map's own gestures", () => {
  // Stretched over the frame, the overlay would otherwise make the map
  // undraggable everywhere the card is not.
  assert.match(map, /pointer-events-none absolute inset-0/);
  assert.match(map, /pointer-events-auto/);
});

test("the Google Maps link opens safely in a new tab", () => {
  assert.match(map, /href=\{location\.linkUrl\}/);
  assert.match(map, /rel="noreferrer noopener"/);
  assert.match(map, /opens in a new tab/, "and says so to a screen reader");
});

// ── The form ──────────────────────────────────────────────────────────────

test("the form posts to the public contact endpoint", () => {
  assert.match(form, /publicApi\.post\("\/public\/contact", toContactPayload/);
});

test("both of §14.2's defences are on the form", () => {
  assert.match(form, /useRecaptcha\("contact"\)/);
  assert.match(form, /name="website" defaultValue=""/);
  assert.match(form, /tabIndex=\{-1\}/, "the honeypot is out of the tab order");
  assert.match(form, /aria-hidden="true"/, "and out of the accessibility tree");
});

test("every control keeps a real label behind the comp's placeholder", () => {
  // The comps show a glyph and a placeholder and no label. A placeholder is not
  // a label: it vanishes on the first keystroke and is not reliably announced.
  assert.match(details + form, /className="sr-only"/);
  assert.match(form, /<label htmlFor=\{id\} className="sr-only">/);
  assert.equal((form.match(/placeholder=/g) ?? []).length, 5, "all five controls still carry the comp's text");
});

test("a field in error says so to a screen reader as well as in colour", () => {
  assert.match(form, /"aria-invalid": error \? true : undefined/);
  assert.match(form, /"aria-describedby": error \? `\$\{id\}-error` : undefined/);
  assert.match(form, /role="alert"/);
});

test("server field errors land on their own fields", () => {
  assert.match(form, /error\.code === ErrorCode\.VALIDATION_ERROR/);
  assert.match(form, /setError\(field, \{ type: "server", message \}\)/);
});

test("the hourly limit is explained rather than reported as a failure", () => {
  // §14.2 allows 5 per hour per IP on this form. "Something went wrong" for a
  // sixth message is a lie about what happened.
  assert.match(form, /ErrorCode\.RATE_LIMITED/);
  assert.match(form, /recently/i);
});

test("success is announced and the form is emptied", () => {
  // The endpoint returns only { received: true } — no reference number, so
  // nothing to show in a modal the way the dealer form does.
  assert.match(form, /role="status"/);
  assert.match(form, /reset\(EMPTY_CONTACT\)/);
  assert.match(form, /Send another message/, "and there is a way back to a blank form");
});

test("submitting twice is not possible while the first is in flight", () => {
  assert.match(form, /disabled=\{isSubmitting\}/);
});

// ── The banner ────────────────────────────────────────────────────────────

test("the hero is driven by a banner placement, with a title as the floor", () => {
  // No CONTACT_HERO banner exists yet. A page whose <h1> waits on one is a page
  // with no name in search results or in a screen reader's heading list.
  assert.match(page, /placement: "CONTACT_HERO"/);
  assert.match(page, /title="Contact Us" breadcrumb="Contact Us"/);
  assert.match(hero, /const heading = banner\?\.title \|\| title;/);
});

test("everything an editor sets beats the fallback", () => {
  assert.match(hero, /banner\?\.eyebrow_text/);
  assert.match(hero, /banner\?\.subtitle/);
  assert.match(hero, /banner\?\.desktop_image\?\.url/);
});

test("the breadcrumb is a landmark, with the current page marked as current", () => {
  assert.match(hero, /aria-label="Breadcrumb"/);
  assert.match(hero, /aria-current="page"/);
});

test("the three panels stack before they are squeezed", () => {
  // §10.5 asks for 360 through 1920. The map only earns a column once both
  // others fit beside it.
  assert.match(page, /lg:grid-cols-\[minmax\(0,19rem\)_minmax\(0,1fr\)\]/);
  assert.match(page, /xl:grid-cols-\[/);
});

test("each panel is a landmark with its own heading", () => {
  assert.match(page, /aria-labelledby="contact-details-heading"/);
  assert.match(page, /aria-labelledby="contact-form-heading"/);
});
