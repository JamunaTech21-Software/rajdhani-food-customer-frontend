import assert from "node:assert/strict";
import { test } from "node:test";

import {
  contactDetails,
  contactSchema,
  displayUrl,
  mapLocation,
  telHref,
  toContactPayload,
} from "../src/lib/contact.js";

// The live `site.contact` block, verbatim.
const CONTACT = {
  address_line: "House 12, Road 5, Banani",
  city: "Dhaka",
  country: "Bangladesh",
  phone_primary: "+880 1700-000001",
  phone_secondary: "+880 1700-000002",
  email_primary: "info@rajdhanifood.com",
  email_secondary: "sales@rajdhanifood.com",
  website_url: "https://rajdhanifood.com",
  business_hours: "Saturday – Thursday, 9:00 AM – 6:00 PM",
};

// The live `site.map`.
const MAP = { latitude: 23.7937, longitude: 90.4066, embed_url: null };

const valid = {
  name: "Rahim Uddin",
  email: "rahim@example.com",
  phone: "+880 1700 111222",
  subject: "Bulk supply",
  message: "Please send your wholesale price list.",
};

// ── Criterion 1: the page is the settings, not a copy of them ─────────────

test("every line of the card comes from the contact block", () => {
  const rows = contactDetails(CONTACT);
  const text = rows.flatMap((row) => row.lines.map((line) => line.text));

  assert.deepEqual(rows.map((row) => row.key), ["address", "phone", "email", "website", "hours"]);
  assert.ok(text.includes("House 12, Road 5, Banani, Dhaka, Bangladesh"), "address is joined");
  assert.ok(text.includes("+880 1700-000002"), "the second phone number is shown, not only the first");
  assert.ok(text.includes("sales@rajdhanifood.com"), "and the second email");
  assert.ok(text.includes("Saturday – Thursday, 9:00 AM – 6:00 PM"));
});

test("a changed address changes the card, with nothing to redeploy", () => {
  // The criterion, as directly as it can be stated here: the same function on a
  // different payload gives a different card.
  const moved = contactDetails({ ...CONTACT, address_line: "Plot 7, Tejgaon I/A", city: "Dhaka" });

  assert.equal(moved[0].lines[0].text, "Plot 7, Tejgaon I/A, Dhaka, Bangladesh");
});

test("phone numbers are dialable and emails are composable", () => {
  const rows = contactDetails(CONTACT);
  const phone = rows.find((row) => row.key === "phone");
  const email = rows.find((row) => row.key === "email");

  assert.equal(phone.lines[0].href, "tel:+8801700000001", "spaces and dashes are not dialable");
  assert.equal(email.lines[0].href, "mailto:info@rajdhanifood.com");
});

test("a row nobody filled in is dropped, not printed empty", () => {
  // phone_secondary, email_secondary and business_hours are all nullable, and a
  // business with one number should not get a blank second line.
  const rows = contactDetails({
    ...CONTACT,
    phone_secondary: null,
    email_secondary: null,
    business_hours: null,
    website_url: null,
  });

  assert.deepEqual(rows.map((row) => row.key), ["address", "phone", "email"]);
  assert.equal(rows.find((row) => row.key === "phone").lines.length, 1);
});

test("an empty contact block produces no rows rather than five headings", () => {
  assert.deepEqual(contactDetails(null), []);
  assert.deepEqual(contactDetails({}), []);
});

test("the website is printed without its scheme but linked with it", () => {
  const website = contactDetails(CONTACT).find((row) => row.key === "website");

  assert.equal(website.lines[0].text, "rajdhanifood.com");
  assert.equal(website.lines[0].href, "https://rajdhanifood.com");
  assert.equal(displayUrl("https://rajdhanifood.com/"), "rajdhanifood.com");
});

test("a phone field with no digits produces no tel: link", () => {
  assert.equal(telHref(""), null);
  assert.equal(telHref(null), null);
  assert.equal(telHref("call us"), null);
});

// ── The map ───────────────────────────────────────────────────────────────

test("the live coordinates give an embed and a Google Maps link", () => {
  const location = mapLocation(MAP, { name: "Rajdhani Food Products", address: "Banani, Dhaka" });

  assert.match(location.embedSrc, /^https:\/\/www\.google\.com\/maps\?q=/);
  assert.match(location.embedSrc, /output=embed/, "the keyless embed — there is no Maps API key");
  assert.equal(location.linkUrl, "https://www.google.com/maps/search/?api=1&query=23.7937%2C90.4066");
  assert.match(location.title, /Rajdhani Food Products/, "the iframe needs an accessible name");
});

test("null island is treated as unset", () => {
  // The schema is explicit: coordinates are null when unset, **not** 0. (0, 0)
  // is open water in the Gulf of Guinea, and a map of it is worse than no map.
  assert.equal(mapLocation({ latitude: 0, longitude: 0 }), null);
  assert.equal(mapLocation({ latitude: null, longitude: null }), null);
  assert.equal(mapLocation({}), null);
  assert.equal(mapLocation(null), null);
});

test("a single coordinate is not a location", () => {
  assert.equal(mapLocation({ latitude: 23.7937, longitude: null }), null);
  assert.equal(mapLocation({ latitude: null, longitude: 90.4066 }), null);
});

test("coordinates off the globe are refused", () => {
  // A transposed pair — 90.4066 as a latitude — would otherwise build a URL
  // Google answers with a blank frame.
  assert.equal(mapLocation({ latitude: 90.4066, longitude: 23.7937 }), null);
  assert.equal(mapLocation({ latitude: 23.79, longitude: 190 }), null);
  assert.equal(mapLocation({ latitude: "north", longitude: 90 }), null);
  assert.equal(mapLocation({ latitude: Infinity, longitude: 90 }), null);
});

test("an editor's own embed URL is used when it is a Google Maps one", () => {
  // "Share → Embed a map" carries a pin, a zoom and a place name that bare
  // coordinates cannot.
  const embed = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3651";
  assert.equal(mapLocation({ ...MAP, embed_url: embed }).embedSrc, embed);
});

test("an embed URL pointing anywhere else is ignored, not framed", () => {
  // The value reaches an iframe src. A settings field is not a place from which
  // to be able to frame arbitrary origins — the CSP says the same thing to the
  // browser, and this is the half that holds without it.
  for (const url of [
    "https://evil.example.com/maps",
    "http://www.google.com/maps?q=1,1&output=embed",
    "javascript:alert(1)",
    "//www.google.com/maps",
    "https://www.google.com.evil.example/maps",
    "not a url",
  ]) {
    const location = mapLocation({ ...MAP, embed_url: url });
    assert.match(location.embedSrc, /^https:\/\/www\.google\.com\/maps\?q=/, `${url} was not rejected`);
  }
});

test("coordinates are rounded rather than carried at float precision", () => {
  const location = mapLocation({ latitude: 23.793700000000001, longitude: 90.40659999999999 });
  assert.equal(location.linkUrl, "https://www.google.com/maps/search/?api=1&query=23.7937%2C90.4066");
});

// ── The message form ──────────────────────────────────────────────────────

test("the three fields the API requires are the three the form requires", () => {
  assert.equal(contactSchema.safeParse(valid).success, true);

  for (const field of ["name", "email", "message"]) {
    const result = contactSchema.safeParse({ ...valid, [field]: "   " });
    assert.equal(result.success, false, `${field} should be required`);
  }
});

test("phone and subject are genuinely optional", () => {
  // Inventing a requirement the API does not have costs messages, on the
  // lowest-friction form on the site.
  assert.equal(contactSchema.safeParse({ ...valid, phone: "", subject: "" }).success, true);
});

test("the API's own lengths are enforced here, not discovered by a round trip", () => {
  assert.equal(contactSchema.safeParse({ ...valid, name: "a".repeat(256) }).success, false);
  assert.equal(contactSchema.safeParse({ ...valid, subject: "a".repeat(256) }).success, false);
  assert.equal(contactSchema.safeParse({ ...valid, phone: "1".repeat(33) }).success, false);
  assert.equal(contactSchema.safeParse({ ...valid, email: `${"a".repeat(250)}@x.com` }).success, false);
});

test("a Bangladeshi number in any of its written forms is accepted", () => {
  for (const phone of ["+880 1700-000001", "01700000001", "+8801700000001", "(02) 5504 1234"]) {
    assert.equal(contactSchema.safeParse({ ...valid, phone }).success, true, phone);
  }
});

test("an address that is not one is caught before it is sent", () => {
  assert.equal(contactSchema.safeParse({ ...valid, email: "rahim@" }).success, false);
});

test("the honeypot is always present and always empty", () => {
  // Omitting it is itself a signal; the live endpoint answers a filled one with
  // 403 FORBIDDEN rather than a validation error.
  const payload = toContactPayload(valid);

  assert.equal(payload.website, "");
  assert.ok("website" in payload);
});

test("blank optional fields are omitted rather than sent as empty strings", () => {
  const payload = toContactPayload({ ...valid, phone: "  ", subject: "" });

  assert.equal(payload.phone, undefined);
  assert.equal(payload.subject, undefined);
  assert.equal(payload.recaptcha_token, undefined, "and no token when none was issued");
});

test("values are trimmed on the way out", () => {
  const payload = toContactPayload({ ...valid, name: "  Rahim  ", message: " hello " });

  assert.equal(payload.name, "Rahim");
  assert.equal(payload.message, "hello");
});

test("a reCAPTCHA token rides along when one was issued", () => {
  assert.equal(toContactPayload(valid, { recaptchaToken: "tok" }).recaptcha_token, "tok");
});

test("the payload carries only the fields the API accepts", () => {
  // `status`, `replied_at`, `internal_notes` and `ip_address` are never
  // client-settable, per the schema.
  assert.deepEqual(
    Object.keys(toContactPayload(valid, { recaptchaToken: "tok" })).sort(),
    ["email", "message", "name", "phone", "recaptcha_token", "subject", "website"],
  );
});
