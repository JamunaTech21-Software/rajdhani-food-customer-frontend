import { Icon } from "../ui/Icon.jsx";

/**
 * The four marks under the dealer hero's copy.
 *
 * **The labels are the `intro` block's bullet list**, not a `FeatureItem`
 * section of their own. `feature_items.section` is a hard enum server-side —
 * `FeatureItemService::requiredSection` rejects anything outside it — so a
 * `DEALER_HERO_USP` section cannot be added without backend work, and the only
 * dealer section that does exist, `DEALER_BENEFITS`, is the five cards further
 * down the page. Drawing those twice would be worse than either option.
 *
 * `bullet_points` is a field every `PageBlock` already has and the `intro`
 * block was not using, so the chips are editable today without a new block, a
 * new section or a backend change. The admin's Page content screen lists it
 * under "Why partner with us" and says where the lines come out.
 *
 * The marks themselves are by position and not editable: a bullet is a string,
 * so there is nowhere on it to put an icon. Four fixed glyphs for a fixed strip
 * is the honest version of that, and a fifth bullet reuses the first — better
 * than an editor adding a line and getting a question mark.
 */
const MARKS = ["award", "shield-check", "package", "handshake"];

export function HeroChips({ items }) {
  if (!items?.length) return null;

  return (
    /*
      Two up on a phone, four from `sm`. Four across a 343px screen is 85px a
      chip and these labels run to two words a line — "Trusted Brand in
      Bangladesh" would be four lines of one word.

      The rules are position-based rather than `divide-x`: at two columns
      `divide-x` puts a rule down the middle of the second row as well, and
      draws one between items that are not a pair. Same reasoning as the USP
      strip, and the same `max-sm` / `sm` split so no cell is given two
      conflicting borders at one width.
    */
    <ul className="mt-8 grid max-w-lg grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 sm:gap-x-0 [&>*]:min-w-0">
      {items.map((label, index) => (
        <li
          key={label}
          className="border-ink-inverse/20 max-sm:[&:nth-child(even)]:border-l max-sm:[&:nth-child(even)]:pl-4 sm:px-4 sm:[&:not(:first-child)]:border-l sm:first:pl-0"
        >
          <span
            aria-hidden="true"
            className="grid size-10 place-items-center rounded-full bg-brand text-on-brand"
          >
            <Icon name={MARKS[index % MARKS.length]} size={19} />
          </span>

          <p className="mt-3 text-sm font-semibold leading-snug text-ink-inverse">{label}</p>
        </li>
      ))}
    </ul>
  );
}
