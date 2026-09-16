import { z } from "zod";

/**
 * The dealer / distributor application (§10.3).
 *
 * Transcribed from `DealerApplicationSubmission`, including the lengths, so a
 * mistake is caught before a round trip.
 *
 * Note what is **not** here: the API also accepts `address_line`,
 * `has_trade_license`, `has_tin_certificate` and `years_of_experience`. The
 * approved design collects none of them — it shows trade licence and TIN as a
 * *requirements checklist*, which is display copy rather than inputs — and
 * RTPP-63's scope lists the seven fields below. They are optional server-side,
 * so submissions succeed; the admin's application detail will simply show those
 * four blank on every row. Raised on RTPP-58; someone should decide whether to
 * add them to the form or drop them from the admin view.
 */

const PHONE = /^[\d\s+()-]{6,32}$/;

export const dealerApplicationSchema = z.object({
  full_name: z.string().trim().min(1, "Please tell us your name").max(255),
  company_name: z.string().trim().min(1, "Please give your company or shop name").max(255),
  phone: z
    .string()
    .trim()
    .min(1, "We need a phone number to reply on")
    .max(32)
    .regex(PHONE, "Use digits, spaces, + or - only"),
  email: z.string().trim().min(1, "We need an email address").max(255).email("That does not look like an email address"),
  district_id: z.string().min(1, "Choose your district"),
  upazila_id: z.string().min(1, "Choose your upazila or city"),
  message: z.string().trim().max(5000).optional(),
});

/** The request body. `website` is the honeypot — present and empty, never omitted. */
export function toApplicationPayload(values, { recaptchaToken } = {}) {
  const message = values.message?.trim();

  return {
    full_name: values.full_name.trim(),
    company_name: values.company_name.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
    district_id: values.district_id,
    upazila_id: values.upazila_id,
    message: message || undefined,
    recaptcha_token: recaptchaToken || undefined,
    website: "",
  };
}

export const EMPTY_APPLICATION = {
  full_name: "",
  company_name: "",
  phone: "",
  email: "",
  district_id: "",
  upazila_id: "",
  message: "",
};

/**
 * What the form should hold after a district changes.
 *
 * RTPP-63's first criterion is "selecting a district repopulates the upazila
 * select correctly **every time**", and the failure it guards against is a
 * stale upazila: pick Bagerhat, choose Bagerhat Sadar, then switch to Dhaka and
 * the old upazila id is still in the form. The API rejects that pairing —
 * "`upazila_id` must belong to `district_id`" — but only after a round trip,
 * and the visitor sees an error about a field they cannot see is wrong.
 *
 * Re-selecting the *same* district is deliberately not a change, so it does not
 * clear a choice the visitor already made.
 */
export function withDistrict(values, districtId) {
  if (values.district_id === districtId) return values;
  return { ...values, district_id: districtId, upazila_id: "" };
}

/** Districts grouped by division, which is how people locate their own. */
export function byDivision(districts) {
  const groups = new Map();

  for (const district of districts ?? []) {
    if (!district?.id) continue;
    const division = district.division_name || "Other";
    if (!groups.has(division)) groups.set(division, []);
    groups.get(division).push(district);
  }

  return [...groups.entries()]
    .map(([division, items]) => ({
      division,
      districts: [...items].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.division.localeCompare(b.division));
}

/**
 * A district or upazila's display name.
 *
 * `name_bn` is null on all 64 districts and every upazila in the live data, so
 * this is English-only today. Written as a fallback rather than hardcoded to
 * `name`, so Bangla appears the moment the column is populated — no code change.
 */
export const placeName = (place) => place?.name_bn || place?.name || "";
