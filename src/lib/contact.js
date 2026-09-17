import { z } from "zod";

/**
 * The contact page's data shaping (§10.4).
 *
 * Every value on this page comes from the `site_profile` contact block and the
 * map coordinates — which is the first acceptance criterion: changing the
 * address or a phone number in the dashboard has to change the page with no
 * deploy. So nothing here is a literal; the module's whole job is to turn the
 * settings payload into rows the page can render, and to say honestly when a
 * field is not set.
 */

// ── The message form ──────────────────────────────────────────────────────

// Same reasoning as the enquiry form: Bangladeshi numbers are written +8801…,
// 01…, with spaces and dashes, and a strict pattern turns a valid number into a
// blocked message. The API caps it at 32 characters and asks no more.
const PHONE = /^[\d\s+()-]{6,32}$/;

/**
 * Transcribed from `ContactMessageSubmission`, lengths included, so the form
 * rejects what the API would rather than round-tripping to find out.
 *
 * Only three fields are required there — name, email, message. Phone and
 * subject are genuinely optional and are left that way: this is the site's
 * lowest-friction form, and inventing requirements costs messages.
 */
export const contactSchema = z.object({
  name: z.string().trim().min(1, "Please tell us your name").max(255),
  email: z
    .string()
    .trim()
    .min(1, "We need an email address to reply to")
    .max(255)
    .email("That does not look like an email address"),
  phone: z.string().trim().max(32).regex(PHONE, "Use digits, spaces, + or - only").or(z.literal("")),
  subject: z.string().trim().max(255),
  message: z.string().trim().min(1, "Please write your message").max(5000),
});

export const EMPTY_CONTACT = { name: "", email: "", phone: "", subject: "", message: "" };

/**
 * The request body.
 *
 * `website` is the honeypot — present and empty. Omitting it is itself a signal,
 * and the API answers a filled one with 403 FORBIDDEN (verified against the live
 * endpoint), not a validation error, so there is no field to attach that to.
 */
export function toContactPayload(values, { recaptchaToken } = {}) {
  const optional = (value) => {
    const text = typeof value === "string" ? value.trim() : value;
    return text ? text : undefined;
  };

  return {
    name: values.name.trim(),
    email: values.email.trim(),
    phone: optional(values.phone),
    subject: optional(values.subject),
    message: values.message.trim(),
    recaptcha_token: recaptchaToken || undefined,
    website: "",
  };
}

// ── The detail card ───────────────────────────────────────────────────────

/** A dialable `tel:` target — digits and a leading + only. */
export function telHref(phone) {
  const digits = String(phone ?? "").replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : null;
}

/** A website shown without its scheme, the way the comps print it. */
export function displayUrl(url) {
  return String(url ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "");
}

const line = (text, href) => (text ? { text: String(text), href: href ?? null } : null);

/**
 * The five rows of the "Get In Touch" card, in the comp's order.
 *
 * A row with nothing in it is dropped rather than rendered as an empty heading:
 * `phone_secondary`, `email_secondary` and `business_hours` are all nullable,
 * and a business with one phone number should not have a blank second line.
 */
export function contactDetails(contact) {
  const c = contact ?? {};

  const address = [c.address_line, c.city, c.country].filter(Boolean).join(", ");

  const rows = [
    { key: "address", icon: "map-pin", label: "Our Address", lines: [line(address)] },
    {
      key: "phone",
      icon: "phone",
      label: "Phone",
      lines: [
        line(c.phone_primary, telHref(c.phone_primary)),
        line(c.phone_secondary, telHref(c.phone_secondary)),
      ],
    },
    {
      key: "email",
      icon: "mail",
      label: "Email",
      lines: [
        line(c.email_primary, c.email_primary ? `mailto:${c.email_primary}` : null),
        line(c.email_secondary, c.email_secondary ? `mailto:${c.email_secondary}` : null),
      ],
    },
    {
      key: "website",
      icon: "globe",
      label: "Website",
      lines: [line(displayUrl(c.website_url), c.website_url || null)],
    },
    { key: "hours", icon: "clock", label: "Business Hours", lines: [line(c.business_hours)] },
  ];

  return rows
    .map((row) => ({ ...row, lines: row.lines.filter(Boolean) }))
    .filter((row) => row.lines.length > 0);
}

// ── The map ───────────────────────────────────────────────────────────────

/**
 * Hosts an editor-supplied `embed_url` may point at.
 *
 * The value reaches an iframe `src`, so it is checked rather than trusted: a
 * settings field is not a place to be able to frame arbitrary origins. The CSP
 * `frame-src` directive says the same thing to the browser — this is the half
 * that still holds if the page is ever served without that header.
 */
const EMBED_HOSTS = new Set(["google.com", "maps.google.com", "google.com.bd"]);

/**
 * One coordinate, or null.
 *
 * `Number(null)` is **0**, which is the whole trap this file is written around:
 * a half-set location — latitude filled in, longitude never touched — would
 * otherwise become a point on the equator and render a map of open water. So an
 * absent value is rejected before it can be coerced, and only a number or a
 * numeric string is read at all.
 */
function coordinate(value, limit) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (value === "") return null;

  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
}

/** Six decimal places is roughly 11 cm — past that it is float noise in a URL. */
const round = (value) => Number(value.toFixed(6));

function safeEmbedUrl(url) {
  const raw = String(url ?? "").trim();
  if (!raw) return null;

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    return parsed.protocol === "https:" && EMBED_HOSTS.has(host) ? raw : null;
  } catch {
    return null;
  }
}

/**
 * Everything the map panel needs, or null when there is no location to show.
 *
 * **Coordinates are null when unset, never 0** — the schema says so in as many
 * words, because (0, 0) is a real place in the Gulf of Guinea and a map of open
 * ocean is worse than no map. Anything non-finite, out of range, or sitting on
 * that null island is treated as "not set".
 *
 * `output=embed` is Google Maps' keyless embed. It needs no API key, which is
 * what makes the map work today: there is no Maps key in the project, and a
 * keyless embed is the difference between a map and a grey box saying so.
 */
export function mapLocation(map, { name, address } = {}) {
  const latitude = coordinate(map?.latitude, 90);
  const longitude = coordinate(map?.longitude, 180);

  if (latitude === null || longitude === null) return null;
  if (latitude === 0 && longitude === 0) return null;

  const query = `${round(latitude)},${round(longitude)}`;
  const label = [name, address].filter(Boolean).join(" — ");

  return {
    latitude: round(latitude),
    longitude: round(longitude),
    // An editor's own "Share → Embed a map" URL wins when it is one we accept:
    // it can carry a pin, a zoom and a place name that coordinates alone cannot.
    embedSrc:
      safeEmbedUrl(map?.embed_url) ??
      `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=15&hl=en&output=embed`,
    linkUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
    title: label ? `Map showing ${label}` : "Map showing our location",
  };
}
