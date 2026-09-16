// Asia/Dhaka, because the client, the content team and the audience are all
// there — a visitor abroad should still see the publication date the editor
// meant, not one shifted into their own zone.
const ZONE = "Asia/Dhaka";
const LOCALE = "en-GB";

const dateFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const numberFormat = new Intl.NumberFormat(LOCALE);

/**
 * The API sends "2026-09-13 08:34:28.127" as well as ISO.
 *
 * That space-separated form is **not** a format `new Date()` is required to
 * parse: V8 accepts it, so it works in Chrome and in node, and Safari returns
 * Invalid Date. Every news date on the site would read "—" on an iPhone, which
 * is exactly the kind of bug that never shows up in development.
 *
 * Timestamps arrive in UTC without a marker, so a bare value gets a `Z` rather
 * than being read as the visitor's local time.
 */
export function toDate(value) {
  if (!value) return null;
  const normalised = typeof value === "string" ? value.replace(" ", "T") : value;
  const date = new Date(/Z|[+-]\d{2}:?\d{2}$/.test(normalised) ? normalised : `${normalised}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value) {
  const date = toDate(value);
  return date ? dateFormat.format(date) : "—";
}

export const formatNumber = (value) => numberFormat.format(value ?? 0);

/** A machine-readable value for <time dateTime>, or null. */
export const toDateTimeAttribute = (value) => toDate(value)?.toISOString() ?? null;
