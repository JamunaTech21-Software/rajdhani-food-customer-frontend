/**
 * Counting a stat up from zero, without touching the label's meaning.
 *
 * `StatCounter.value` is **a display string, not a number** — the API says so
 * outright, and the live data proves it: `25+`, `1000+`, `64`, `100%`. Animating
 * it means finding the number inside, counting that, and putting the prefix and
 * suffix back — so `100%` counts to 100 and keeps its sign, and a value with no
 * digits at all is left exactly as written rather than becoming `NaN`.
 *
 * Pure, so the parsing and easing are testable without a DOM or a timer.
 */

/** Split "1000+" into { prefix: "", number: 1000, suffix: "+" }, or null. */
export function parseStatValue(value) {
  const text = String(value ?? "");
  const match = text.match(/^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/s);
  if (!match) return null;

  const [, prefix, digits, suffix] = match;
  const number = Number(digits.replace(/,/g, ""));
  if (!Number.isFinite(number)) return null;

  // Decimals are preserved so "4.8" does not animate to "5".
  const decimals = digits.includes(".") ? digits.split(".")[1].length : 0;

  return { prefix, number, suffix, decimals };
}

/**
 * Ease-out cubic: fast at the start, settling at the end.
 *
 * Linear counting reads as a machine ticking; easing out makes the number
 * arrive rather than stop. Clamped so a late frame cannot overshoot the target.
 */
export const easeOut = (t) => 1 - (1 - Math.min(Math.max(t, 0), 1)) ** 3;

/** The value to display at a given progress through the animation. */
export function frameValue(value, progress) {
  const parsed = parseStatValue(value);
  if (!parsed) return String(value ?? "");

  const { prefix, number, suffix, decimals } = parsed;
  const current = number * easeOut(progress);

  return `${prefix}${current.toFixed(decimals)}${suffix}`;
}

/** How long to count, capped so a big number does not crawl. */
export const durationFor = (value) => {
  const parsed = parseStatValue(value);
  if (!parsed) return 0;
  return Math.min(400 + Math.log10(Math.max(parsed.number, 1)) * 350, 1600);
};
