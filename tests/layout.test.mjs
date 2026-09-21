import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { hasSocialMark, socialMark, SOCIAL_PLATFORMS } from "../src/components/ui/social-marks.js";

const read = (path) => readFileSync(fileURLToPath(new URL(`../src/${path}`, import.meta.url)), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const header = strip(read("components/layout/Header.jsx"));
const footer = strip(read("components/layout/Footer.jsx"));
const dropdown = strip(read("components/layout/ProductsDropdown.jsx"));
const drawer = strip(read("components/layout/MobileDrawer.jsx"));
const layout = strip(read("components/layout/SiteLayout.jsx"));

// ── Criterion 1: a new category reaches the dropdown ───────────────────────

test("the dropdown is built from Category, not from a hardcoded list", () => {
  // "Adding a category in admin adds it to the dropdown without a deploy."
  assert.match(dropdown, /categoryLinks\(categories\)/);
  assert.match(header, /useCategories\(\)/);
  assert.doesNotMatch(dropdown, /Premium Tea|Green Tea|Black Tea/, "no category names in code");
});

test("nothing filters categories out of the menu", () => {
  // Filtering on product_count would mean a category created in admin stays
  // invisible until a product is added to it — which fails the criterion.
  const nav = strip(read("lib/nav.js"));

  assert.doesNotMatch(nav, /product_count\s*[><]/);
  assert.doesNotMatch(dropdown, /product_count\s*[><]/);
});

// ── Criterion 2: keyboard navigable, visible focus ─────────────────────────

test("the Products menu is a disclosure, not an ARIA menu", () => {
  // role="menu" is for application commands. Using it for navigation makes a
  // screen reader announce links as menu items and swallows the Tab key people
  // actually navigate with.
  assert.match(dropdown, /aria-expanded=\{open\}/);
  assert.match(dropdown, /aria-controls=\{panelId\}/);
  assert.doesNotMatch(dropdown, /role="menu"/);
  assert.doesNotMatch(dropdown, /role="menuitem"/);
});

test("Escape closes the menu and returns focus to its button", () => {
  // Otherwise focus is left on a hidden element and the next Tab restarts from
  // the top of the page.
  assert.match(dropdown, /event\.key !== "Escape"/);
  assert.match(dropdown, /buttonRef\.current\?\.focus\(\)/);
});

test("the menu closes when focus leaves it", () => {
  assert.match(dropdown, /onBlur=/);
  assert.match(dropdown, /contains\(event\.relatedTarget\)/);
});

test("the menu opens on click, not hover", () => {
  // A hover menu is unreachable on touch and a known trap for imprecise
  // pointer control.
  assert.match(dropdown, /onClick=\{\(\) => setOpen/);
  assert.doesNotMatch(dropdown, /onMouseEnter|onMouseOver/);
});

test("a closed menu is not in the tab order at all", () => {
  // Rendered conditionally rather than hidden with CSS: a visually hidden panel
  // still receives focus in some browsers.
  assert.match(dropdown, /\{open \? \(/);
});

test("the drawer traps focus rather than hand-rolling it", () => {
  // Focus trapping, focus restoration and hiding the page behind it are each
  // easy to get subtly wrong, and this criterion is exactly about that.
  assert.match(drawer, /@radix-ui\/react-dialog/);
  assert.match(drawer, /Dialog\.Content/);
  assert.match(drawer, /Dialog\.Close/);
});

test("every control that is only an icon carries a name", () => {
  assert.match(header, /aria-label="Open menu"/);
  assert.match(drawer, /aria-label="Close menu"/);
  assert.match(footer, /aria-label=\{`\$\{account\.platform\} \(opens in a new tab\)`\}/);
});

test("the current page is announced, not only underlined", () => {
  // The underline is invisible to a screen reader; aria-current is what it reads.
  assert.match(header, /aria-current=\{active \? "page" : undefined\}/);
  assert.match(drawer, /aria-current=\{active \? "page" : undefined\}/);
});

test("a skip link lets a keyboard user past the header", () => {
  // Otherwise every page begins with the logo, eight nav links, the disclosure
  // and the CTA before any content.
  assert.match(layout, /href="#main"/);
  assert.match(layout, /focus:not-sr-only/, "visible once focused");
  assert.match(layout, /id="main"/);
});

test("a focus ring is never removed without one taking its place", () => {
  // §18 requires AA; `outline-none` with nothing behind it is the usual way
  // that gets broken. The rule is not "never write it" though — the footer's
  // newsletter control is one clipped pill, so the ring has to move from the
  // input out to the wrapper, or `overflow-hidden` eats half of it. What the
  // rule forbids is removing a ring and putting nothing back.
  for (const [name, source] of Object.entries({ header, footer, dropdown, drawer, layout })) {
    const removals = source.match(/\bfocus:outline-none\b|(?<!focus:)\boutline-none\b/g) ?? [];
    if (!removals.length) continue;

    assert.equal(name, "footer", `${name} removes a focus ring`);
    // Every removal in the footer is inside the newsletter control, and that
    // control draws the ring itself.
    assert.equal(removals.length, 1);
    const form = footer.match(/<form[\s\S]*?<\/form>/)[0];
    assert.match(form, /focus:outline-none/);
    assert.match(form, /focus-within:outline focus-within:outline-2/);
    assert.match(form, /focus-within:outline-brand/);
  }
});

// ── Sourcing ──────────────────────────────────────────────────────────────

test("the chrome reads the store rather than refetching", () => {
  // One /public/layout request at boot, shared by header and footer.
  assert.match(header, /useSiteStore/);
  assert.match(footer, /useSiteStore/);
  for (const source of [header, footer]) {
    assert.doesNotMatch(source, /public\/layout/, "no second layout request");
  }
});

test("the footer is generated from the API, not written out", () => {
  assert.match(footer, /menus\?\.footer_quick/);
  assert.match(footer, /menus\?\.footer_products/);
  assert.match(footer, /menus\?\.legal/);
  assert.match(footer, /social\.map/);
  assert.match(footer, /contact\.phone_primary/);
  assert.match(footer, /contact\.email_primary/);
});

test("an empty menu renders nothing rather than a bare heading", () => {
  // A "Products" heading above no links reads as a rendering failure.
  assert.match(footer, /if \(!links\?\.length\) return null/);
});

test("the newsletter form appears only when the setting says so", () => {
  // It posts to an endpoint that is switched off with the same flag.
  assert.match(footer, /newsletter\?\.enabled === true/);
  assert.match(footer, /\{newsletterOn \? \(/);
});

test("the footer band sits on the shared section rhythm", () => {
  // `mt-16` on top of the previous band's own `py-(--space-section)` was two
  // gaps stacked — 112px where the reference butts the footer straight
  // against the section above it.
  assert.doesNotMatch(footer, /<footer className="[^"]*\bmt-\d/, "no extra gap above the footer");
  assert.match(footer, /py-\(--space-section\)/);
});

test("the newsletter field and its button read as one control", () => {
  // The reference draws a white pill with a green square welded to its right
  // edge. A gap between the two, or a gold button, reads as two unrelated
  // controls that happen to sit near each other.
  const form = footer.match(/<form[\s\S]*?<\/form>/)[0];
  assert.match(form, /overflow-hidden rounded-md bg-surface/);
  assert.doesNotMatch(form, /className="mt-4 flex gap-/, "no gap between field and button");
  // `bg-brand-dark`, not `bg-brand`: the footer itself became `bg-brand` in
  // the same phase, so a `bg-brand` button was the same colour as the ground
  // behind it and vanished — a white field with a paper plane floating on
  // green beside it. The comp keeps its two greens a shade apart and draws a
  // light stroke round the whole control; the ring is that stroke.
  assert.match(form, /bg-brand-dark text-on-brand/);
  assert.match(form, /ring-1 ring-ink-inverse\/25/);
  assert.doesNotMatch(form, /bg-gold/, "the subscribe button is brand green, not gold");
  assert.doesNotMatch(form, /bg-brand text-on-brand/, "and not the footer's own colour");

  // The wrapper clips the children, so the input cannot draw its own focus
  // ring — the ring has to trace the whole control instead, or focus becomes
  // invisible.
  assert.match(form, /focus-within:outline-brand/);
  assert.match(form, /focus:outline-none/);

  // WCAG 2.5.5: the button is still a 44px target.
  assert.match(form, /size-11/);
});

test("the footer is the brand green the comp samples, not the deep shade", () => {
  // #015826 in the comp against #1b5e20 for brand and #0d3411 for brand-deep —
  // the footer and the dealer bar above it are one colour there.
  assert.match(footer, /<footer className="bg-brand text-ink-inverse"/);
});

test("a hairline separates the link columns, but not the brand block", () => {
  // Three rules in the comp: quick|products, products|contact,
  // contact|newsletter. Nothing between the brand block and Quick Links.
  const rules = footer.match(/COLUMN_RULE/g) ?? [];
  assert.equal(rules.length, 4, "one definition and three uses");
  assert.doesNotMatch(footer, /title="Quick Links" links=\{menus\?\.footer_quick\} className/);

  // The gutter is not allowed to change size: the negative margin buys the
  // 20px the padding gives back, so the line centres in the existing gap.
  assert.match(footer, /lg:-ml-5 lg:border-l lg:border-ink-inverse\/15 lg:pl-5/);
  // And the same trick vertically, from xl, where all five blocks share a row.
  assert.match(footer, /xl:-my-\(--space-section\) xl:py-\(--space-section\)/);
});

test("the rule above the legal row stops where the content does", () => {
  // It spans the container's content box in the comp, not the window. A
  // border on the full-bleed wrapper ran edge to edge.
  assert.doesNotMatch(footer, /<div className="border-t border-ink-inverse\/15">/);
  assert.match(footer, /flex flex-wrap items-center justify-between gap-3 border-t border-ink-inverse\/15/);
});

// ── Social marks ──────────────────────────────────────────────────────────

test("every platform the API actually returns has a real mark", () => {
  // Live data on 2026-09-16: facebook, instagram, youtube, linkedin, whatsapp.
  for (const platform of ["facebook", "instagram", "youtube", "linkedin", "whatsapp"]) {
    assert.ok(hasSocialMark(platform), `no mark for ${platform}`);
  }
  assert.equal(SOCIAL_PLATFORMS.length, 5);
});

test("platform matching is forgiving about case and spacing", () => {
  // `platform` is free text an admin types, not an enum.
  assert.ok(hasSocialMark("Facebook"));
  assert.ok(hasSocialMark("  YouTube  "));
});

test("an unknown platform falls back rather than disappearing", () => {
  // Rendering nothing would silently drop an account someone just added.
  assert.equal(socialMark("mastodon"), null);
  assert.equal(hasSocialMark(null), false);
  assert.match(strip(read("components/ui/SocialIcon.jsx")), /if \(!path\)[\s\S]*?Globe/);
});

test("every mark is a single closed path on a 24x24 grid", () => {
  for (const platform of SOCIAL_PLATFORMS) {
    const path = socialMark(platform);
    assert.match(path, /^M/, `${platform} does not start with a moveto`);
    assert.ok(path.length > 100, `${platform}'s path looks truncated`);
  }
});
