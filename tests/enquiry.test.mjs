import assert from "node:assert/strict";
import { test } from "node:test";

import { enquirySchema, initialEnquiryValues, toEnquiryPayload } from "../src/lib/enquiry.js";

const VALID = {
  name: "Ahmed Hossain",
  company_name: "Hossain Traders",
  phone: "+8801700000000",
  email: "ahmed@example.com",
  city: "Chattogram",
  pack_size_label: "500g",
  quantity: "50 kg",
  message: "Please quote for monthly supply.",
};

test("a complete enquiry passes", () => {
  assert.equal(enquirySchema.safeParse(VALID).success, true);
});

test("the five fields the API requires are required here too", () => {
  // required: [name, phone, email, city, message]. Catching them client-side
  // saves a round trip on the platform's only conversion path.
  for (const field of ["name", "phone", "email", "city", "message"]) {
    const result = enquirySchema.safeParse({ ...VALID, [field]: "" });
    assert.equal(result.success, false, `${field} should be required`);
  }
});

test("the optional fields really are optional", () => {
  const minimal = { name: "A", phone: "01700000000", email: "a@b.com", city: "Dhaka", message: "Hello" };
  assert.equal(enquirySchema.safeParse(minimal).success, true);
});

test("whitespace alone is not an answer", () => {
  assert.equal(enquirySchema.safeParse({ ...VALID, name: "   " }).success, false);
  assert.equal(enquirySchema.safeParse({ ...VALID, message: "  \n " }).success, false);
});

test("phone numbers are accepted the way people actually write them", () => {
  // A strict pattern here turns a valid number into a blocked conversion.
  for (const phone of ["+8801700000000", "01700000000", "+880 1700 000 000", "01700-000000", "(01700) 000000"]) {
    assert.equal(enquirySchema.safeParse({ ...VALID, phone }).success, true, `${phone} should be accepted`);
  }
});

test("a phone number of letters is not", () => {
  for (const phone of ["call me", "abc", "+880-CALL-NOW"]) {
    assert.equal(enquirySchema.safeParse({ ...VALID, phone }).success, false, `${phone} should be rejected`);
  }
});

test("the API's length caps are enforced before sending", () => {
  assert.equal(enquirySchema.safeParse({ ...VALID, name: "x".repeat(256) }).success, false);
  assert.equal(enquirySchema.safeParse({ ...VALID, phone: "1".repeat(33) }).success, false);
  assert.equal(enquirySchema.safeParse({ ...VALID, city: "x".repeat(129) }).success, false);
  assert.equal(enquirySchema.safeParse({ ...VALID, quantity: "x".repeat(65) }).success, false);
});

test("quantity is free text, not a number", () => {
  // The API's own example is "50 kg". A B2B buyer means cartons or kilos far
  // more often than units, and an integer field would throw that away.
  for (const quantity of ["50 kg", "10 cartons", "2", "500-1000 packets"]) {
    assert.equal(enquirySchema.safeParse({ ...VALID, quantity }).success, true, `${quantity} should be accepted`);
  }
});

// ── The payload ───────────────────────────────────────────────────────────

test("the honeypot is present and empty, never omitted", () => {
  // Omitting it is itself a signal, and the API refuses a filled one with a
  // 403 — verified live against the running endpoint.
  const payload = toEnquiryPayload(VALID, {});

  assert.ok("website" in payload);
  assert.equal(payload.website, "");
});

test("the product, pack size and quantity reach the request", () => {
  // RTPP-62's first criterion: the enquiry must arrive in admin with all three.
  const payload = toEnquiryPayload(VALID, {
    productId: "01M2D2DTMQZ5M2EPSHC3JZBGYH",
    sourcePage: "/products/rajdhani-classic-black-tea",
  });

  assert.equal(payload.product_id, "01M2D2DTMQZ5M2EPSHC3JZBGYH");
  assert.equal(payload.pack_size_label, "500g");
  assert.equal(payload.quantity, "50 kg");
  assert.equal(payload.source_page, "/products/rajdhani-classic-black-tea");
});

test("blank optional fields are omitted rather than sent empty", () => {
  // `company_name: ""` would store an empty string where null is meant.
  const payload = toEnquiryPayload(
    { ...VALID, company_name: "  ", quantity: "", pack_size_label: "" },
    {},
  );

  assert.equal(payload.company_name, undefined);
  assert.equal(payload.quantity, undefined);
  assert.equal(payload.pack_size_label, undefined);
});

test("a general enquiry with no product is still a valid payload", () => {
  // product_id is optional — the endpoint says so, and the contact page will
  // use the same shape.
  const payload = toEnquiryPayload(VALID, {});
  assert.equal(payload.product_id, undefined);
});

test("the recaptcha token is omitted when there is none", () => {
  // No site key is configured yet, and the endpoint accepts submissions without
  // a token — confirmed live. Sending `recaptcha_token: ""` would be worse than
  // sending nothing.
  assert.equal(toEnquiryPayload(VALID, {}).recaptcha_token, undefined);
  assert.equal(toEnquiryPayload(VALID, { recaptchaToken: "abc" }).recaptcha_token, "abc");
});

test("every value is trimmed on the way out", () => {
  const payload = toEnquiryPayload({ ...VALID, name: "  Ahmed  ", email: " a@b.com " }, {});

  assert.equal(payload.name, "Ahmed");
  assert.equal(payload.email, "a@b.com");
});

// ── Pre-population ────────────────────────────────────────────────────────

test("the modal opens carrying the pack and quantity from the page", () => {
  const values = initialEnquiryValues({ pack: { label: "500g" }, quantity: 3 });

  assert.equal(values.pack_size_label, "500g");
  assert.equal(values.quantity, "3", "as text, so it can be rewritten as '50 kg'");
});

test("a signed-in customer's details are pre-filled", () => {
  const values = initialEnquiryValues({
    customer: { name: "Ahmed", email: "a@b.com", phone: "01700000000", city: "Dhaka" },
  });

  assert.equal(values.name, "Ahmed");
  assert.equal(values.email, "a@b.com");
  assert.equal(values.city, "Dhaka");
});

test("a signed-out visitor gets blanks, not undefined", () => {
  // undefined would make React treat the inputs as uncontrolled and warn on the
  // first keystroke.
  const values = initialEnquiryValues({});

  for (const [field, value] of Object.entries(values)) {
    assert.equal(typeof value, "string", `${field} should be a string`);
  }
  assert.deepEqual(initialEnquiryValues(), initialEnquiryValues({}));
});
