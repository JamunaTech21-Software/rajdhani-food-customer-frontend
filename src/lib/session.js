/**
 * The customer session, as data (§7.1, §9.7).
 *
 * Pure, so the parts that are easy to get subtly wrong — what counts as a
 * session, which profile fields may be sent, what clearing one means — are
 * testable without a Google account or a browser.
 */

/**
 * Normalise a sign-in or refresh response.
 *
 * Both endpoints answer `{ customer, tokens }`, and sign-in adds `is_new`. A
 * session without an access token is not a session: the cookie may still be
 * valid, but nothing can be requested with it until a refresh returns one, and
 * treating it as signed in would show an account page that 401s on every query.
 */
export function toSession(payload) {
  const accessToken = payload?.tokens?.access_token ?? null;
  const customer = payload?.customer ?? null;

  if (!accessToken || !customer?.id) return null;

  return { accessToken, customer, isNew: payload?.is_new === true };
}

/**
 * The fields `PATCH /auth/customer/me` accepts — and only those.
 *
 * Not name or avatar: Google owns those and overwrites them at the next
 * sign-in, so a form that offered them would quietly discard what was typed.
 * Not email: it is the identity key.
 *
 * An empty string clears a field, which is why blanks are *sent* rather than
 * dropped the way a public form's optional fields are. Omitting a key here
 * would mean "leave it alone" and there would be no way to remove a phone
 * number once given.
 */
export const EDITABLE_FIELDS = ["phone", "city", "company_name"];

export function profileUpdate(values) {
  const body = {};
  for (const field of EDITABLE_FIELDS) {
    if (values && field in values) body[field] = String(values[field] ?? "").trim();
  }
  return body;
}

/** What the profile form opens with — never undefined, or React warns. */
export function initialProfile(customer) {
  return {
    phone: customer?.phone ?? "",
    city: customer?.city ?? "",
    company_name: customer?.company_name ?? "",
  };
}

/** Whether anything actually changed, so an unchanged form does not PATCH. */
export function hasProfileChanges(values, customer) {
  const before = initialProfile(customer);
  return EDITABLE_FIELDS.some((field) => (values?.[field] ?? "").trim() !== before[field].trim());
}

/**
 * Two letters for an avatar fallback.
 *
 * Google supplies a picture for almost every account, but `avatar_url` is
 * nullable and the image can fail to load; a grey circle with no initials is
 * indistinguishable from a broken one.
 */
export function initials(customer) {
  // The local part only, when falling back to an email. Splitting the whole
  // address gives "rahim.uddin@example.com" the initials **RC** — first word
  // and last, where the last word is the top-level domain.
  const name = customer?.name?.trim();
  const source = name || customer?.email?.trim().split("@")[0] || "";
  const words = source.split(/[\s._-]+/).filter(Boolean);

  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** The name to greet someone by: their first name, or the email local part. */
export function greetingName(customer) {
  const name = customer?.name?.trim();
  if (name) return name.split(/\s+/)[0];

  const email = customer?.email?.trim();
  return email ? email.split("@")[0] : "there";
}

/**
 * Review statuses, as a customer sees them.
 *
 * `PENDING` is the interesting one: a customer who writes a review and finds no
 * trace of it assumes it was lost. It is shown, labelled, with the reason.
 */
export const REVIEW_STATUS = {
  PENDING: { label: "Awaiting moderation", tone: "warning" },
  APPROVED: { label: "Published", tone: "success" },
  REJECTED: { label: "Not published", tone: "danger" },
};

export const reviewStatus = (status) =>
  REVIEW_STATUS[status] ?? { label: "Unknown", tone: "warning" };
