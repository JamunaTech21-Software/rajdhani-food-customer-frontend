import assert from "node:assert/strict";
import { test } from "node:test";

import {
  byDivision,
  dealerApplicationSchema,
  EMPTY_APPLICATION,
  placeName,
  toApplicationPayload,
  withDistrict,
} from "../src/lib/dealerApplication.js";

const VALID = {
  full_name: "Ahmed Hossain",
  company_name: "Hossain Traders",
  phone: "+8801700000000",
  email: "ahmed@example.com",
  district_id: "01M2CYEKNSYJHQS6ZH71A2EKQ0",
  upazila_id: "01M2CYEKNSYJHQS6ZH71A2EKQ1",
  message: "We run four shops in Bagerhat.",
};

// ── Criterion 1: selecting a district repopulates upazila every time ──────

test("changing district clears the upazila", () => {
  // The failure guarded against: pick Bagerhat, choose Bagerhat Sadar, switch
  // to Dhaka, and the old upazila id is still in the form. The API rejects that
  // pairing — but only after a round trip, and the error names a field the
  // visitor cannot see is wrong.
  const next = withDistrict(VALID, "SOME-OTHER-DISTRICT");

  assert.equal(next.district_id, "SOME-OTHER-DISTRICT");
  assert.equal(next.upazila_id, "", "the stale upazila must not survive");
});

test("re-selecting the same district does not wipe the choice", () => {
  // Otherwise clicking the already-selected district throws away a valid
  // upazila the visitor had already picked.
  const same = withDistrict(VALID, VALID.district_id);

  assert.equal(same.upazila_id, VALID.upazila_id);
  assert.equal(same, VALID, "and it is the same object, so nothing re-renders");
});

test("everything else survives a district change", () => {
  const next = withDistrict(VALID, "OTHER");

  assert.equal(next.full_name, "Ahmed Hossain");
  assert.equal(next.company_name, "Hossain Traders");
  assert.equal(next.message, "We run four shops in Bagerhat.");
});

test("clearing the district clears the upazila too", () => {
  assert.equal(withDistrict(VALID, "").upazila_id, "");
});

test("an application cannot be submitted without both places", () => {
  assert.equal(dealerApplicationSchema.safeParse({ ...VALID, district_id: "" }).success, false);
  assert.equal(dealerApplicationSchema.safeParse({ ...VALID, upazila_id: "" }).success, false);
});

// ── Districts and divisions ───────────────────────────────────────────────

test("districts are grouped by division", () => {
  // 64 districts in one flat select is a scroll; grouped by division is how
  // someone actually locates their own.
  const grouped = byDivision([
    { id: "1", name: "Bagerhat", division_name: "Khulna" },
    { id: "2", name: "Dhaka", division_name: "Dhaka" },
    { id: "3", name: "Khulna", division_name: "Khulna" },
  ]);

  assert.deepEqual(grouped.map((g) => g.division), ["Dhaka", "Khulna"]);
  assert.deepEqual(grouped[1].districts.map((d) => d.name), ["Bagerhat", "Khulna"]);
});

test("a district with no division still appears", () => {
  // Dropping it would make a district unselectable, and someone lives there.
  const grouped = byDivision([{ id: "1", name: "Nowhere" }]);
  assert.equal(grouped[0].division, "Other");
});

test("malformed districts are skipped rather than crashing the select", () => {
  const grouped = byDivision([null, { name: "No id" }, { id: "1", name: "Fine", division_name: "Dhaka" }]);

  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].districts.length, 1);
  assert.deepEqual(byDivision(null), []);
});

test("Bangla names are used when they exist, English until then", () => {
  // name_bn is null on all 64 districts and every upazila in the live data, so
  // this is English-only today — but written so Bangla appears the moment the
  // column is populated, with no code change.
  assert.equal(placeName({ name: "Bagerhat", name_bn: null }), "Bagerhat");
  assert.equal(placeName({ name: "Bagerhat", name_bn: "বাগেরহাট" }), "বাগেরহাট");
  assert.equal(placeName(null), "");
});

// ── The payload ───────────────────────────────────────────────────────────

test("the honeypot is present and empty", () => {
  const payload = toApplicationPayload(VALID, {});

  assert.ok("website" in payload);
  assert.equal(payload.website, "");
});

test("both place ids reach the request", () => {
  const payload = toApplicationPayload(VALID, {});

  assert.equal(payload.district_id, VALID.district_id);
  assert.equal(payload.upazila_id, VALID.upazila_id);
});

test("an empty message is omitted rather than sent blank", () => {
  assert.equal(toApplicationPayload({ ...VALID, message: "   " }, {}).message, undefined);
  assert.equal(toApplicationPayload({ ...VALID, message: "Hello" }, {}).message, "Hello");
});

test("the five required fields are required", () => {
  // required: [full_name, company_name, phone, email, district_id, upazila_id]
  for (const field of ["full_name", "company_name", "phone", "email"]) {
    assert.equal(
      dealerApplicationSchema.safeParse({ ...VALID, [field]: "" }).success,
      false,
      `${field} should be required`,
    );
  }
});

test("the message really is optional", () => {
  const { message, ...withoutMessage } = VALID;
  assert.ok(message);
  assert.equal(dealerApplicationSchema.safeParse(withoutMessage).success, true);
});

test("the empty form is all strings, so no input starts uncontrolled", () => {
  for (const [field, value] of Object.entries(EMPTY_APPLICATION)) {
    assert.equal(typeof value, "string", `${field} should be a string`);
  }
});
