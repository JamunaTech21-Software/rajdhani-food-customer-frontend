import { z } from "zod";

/**
 * The product enquiry — the platform's primary conversion path (§2, §10.2).
 *
 * There is no cart and no checkout: this form *is* the transaction, which is why
 * it gets the care a checkout would.
 *
 * The schema is transcribed from `EnquirySubmission`, including the lengths, so
 * the form rejects what the API would rather than round-tripping to find out.
 */

// Deliberately permissive. Bangladeshi numbers are written +8801…, 01…, with
// spaces and dashes, and a strict pattern turns a valid number into a blocked
// conversion. The API caps it at 32 characters and asks no more.
const PHONE = /^[\d\s+()-]{6,32}$/;

export const enquirySchema = z.object({
  name: z.string().trim().min(1, "Please tell us your name").max(255),
  company_name: z.string().trim().max(255).optional(),
  phone: z
    .string()
    .trim()
    .min(1, "We need a phone number to reply on")
    .max(32)
    .regex(PHONE, "Use digits, spaces, + or - only"),
  email: z
    .string()
    .trim()
    .min(1, "We need an email address")
    .max(255)
    .email("That does not look like an email address"),
  city: z.string().trim().min(1, "Which city are you in?").max(128),
  pack_size_label: z.string().trim().max(64).optional(),
  // A string, not a number — the API's own example is "50 kg". A B2B buyer
  // asking for a quantity means cartons or kilos far more often than units,
  // and forcing an integer would throw that away.
  quantity: z.string().trim().max(64).optional(),
  message: z.string().trim().min(1, "Tell us what you need").max(5000),
});

/**
 * The request body.
 *
 * `website` is the honeypot — a field no real form on the site uses, so only a
 * bot's autofill ever populates it. It must be **present and empty**: omitting
 * it entirely is itself a signal, and the API refuses a filled one with a 403.
 */
export function toEnquiryPayload(values, { productId, sourcePage, recaptchaToken } = {}) {
  const trimmed = (value) => {
    const text = typeof value === "string" ? value.trim() : value;
    return text ? text : undefined;
  };

  return {
    product_id: productId || undefined,
    name: values.name.trim(),
    company_name: trimmed(values.company_name),
    phone: values.phone.trim(),
    email: values.email.trim(),
    city: values.city.trim(),
    pack_size_label: trimmed(values.pack_size_label),
    quantity: trimmed(values.quantity),
    message: values.message.trim(),
    source_page: sourcePage || undefined,
    recaptcha_token: recaptchaToken || undefined,
    website: "",
  };
}

/**
 * The values the modal opens with.
 *
 * §10.2 wants it "pre-populated with the product, selected pack size and
 * quantity", and pre-filled from the customer's account when signed in. The
 * customer half degrades cleanly to blanks — accounts arrive in RTPP-68.
 */
export function initialEnquiryValues({ pack, quantity, customer } = {}) {
  return {
    name: customer?.name ?? "",
    company_name: customer?.company_name ?? "",
    phone: customer?.phone ?? "",
    email: customer?.email ?? "",
    city: customer?.city ?? "",
    pack_size_label: pack?.label ?? "",
    // The stepper's number, as text, so it arrives filled but can be rewritten
    // as "50 kg" or "10 cartons" — which is what the field is sized for.
    quantity: quantity ? String(quantity) : "",
    message: "",
  };
}
