import { contrastRatio, readableOn, shade } from "@shared/theme/color.js";

import { CloudinaryImage } from "../CloudinaryImage.jsx";
import { Icon } from "../ui/Icon.jsx";
import { cn } from "../../lib/cn.js";

/**
 * The mark: a filled disc, or a pale wash of the same hue.
 *
 * `solid` is the original — the editor's `icon_bg_color` as the fill, with the
 * glyph colour **computed** rather than assumed white, because the live values
 * are the brand green and the gold and a white glyph on gold fails AA.
 *
 * `tint` is what the home page's USP strip needs: the reference draws pale
 * mint circles with green glyphs, and all four live items are set to the solid
 * brand green, so the strip rendered as four dark discs. Rather than ignore
 * `icon_bg_color` — which is a control an editor is entitled to use — the
 * chosen colour becomes the **glyph** and a pale version of it becomes the
 * fill. An editor who picks gold still gets a gold mark; it is just drawn the
 * way the design asks.
 *
 * `shade(colour, 0.93, 0.33)` reproduces `--color-brand-tint` from
 * `--color-brand` to within one hex digit, so the brand case matches the token
 * exactly and every other hue is treated consistently with it.
 *
 * The contrast guard is the part that matters. Brand-on-its-own-tint is
 * 6.48:1, but a pale choice — a light yellow, say — would tint to near-white
 * and leave the glyph invisible. Below WCAG 1.4.11's 3:1 for a graphical
 * object, the glyph falls back to whatever actually reads on that wash.
 */
const MARK_CONTRAST_FLOOR = 3;

function markStyle(colour, tone) {
  if (!colour) return null;
  if (tone !== "tint") return { backgroundColor: colour, color: readableOn(colour) };

  const wash = shade(colour, 0.93, 0.33);
  const legible = contrastRatio(colour, wash) >= MARK_CONTRAST_FLOOR;

  return { backgroundColor: wash, color: legible ? colour : readableOn(wash) };
}

/**
 * One `FeatureItem` — an icon, a title and a line of description.
 *
 * The same row appears in the home page's USP strip, Quality's commitment grid
 * and the dealer benefits, because it is the same payload each time. It lived
 * inside `UspStrip` until the other sections had an endpoint to read.
 */
export function FeatureItem({ item, size = 44, tone = "solid", markClassName }) {
  const background = item.icon_bg_color || undefined;

  return (
    // A tighter gutter on a phone: two of these share 358px of content in the
    // home page's 2x2 strip, so the text column is about 115px and every
    // saved pixel is a word that stays on its line.
    <li className="flex items-start gap-2.5 sm:gap-3.5">
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-full bg-brand-tint text-brand",
          markClassName,
        )}
        style={{
          // `markClassName` is how a caller makes the disc responsive: an
          // inline width beats any class, so the two cannot both be set.
          ...(markClassName ? null : { width: size, height: size }),
          ...markStyle(background, tone),
        }}
      >
        {/* An uploaded icon wins over a named one — the admin allows either. */}
        {item.icon?.url ? (
          <CloudinaryImage
            src={item.icon.url}
            alt=""
            width={Math.round(size / 2)}
            height={Math.round(size / 2)}
            className="size-1/2"
            imgClassName="object-contain"
          />
        ) : (
          <Icon
            name={item.icon_name}
            size={Math.round(size * 0.45)}
            // Same reason as the uploaded branch's `size-1/2`: a CSS length
            // overrides the SVG's width attribute, so the glyph tracks a
            // responsive disc instead of staying at the numeric size.
            className={markClassName ? "size-[45%]" : undefined}
          />
        )}
      </span>

      {/*
        `data-feature-title` / `data-feature-text` are the hooks a caller
        styles through. These are spans, not an h3 and a p — a strip of four
        marketing lines is not four headings — so a parent cannot reach them
        by tag name without also catching whatever else it contains.
      */}
      <span className="min-w-0">
        <span data-feature-title className="block text-sm font-semibold text-ink">
          {item.title}
        </span>
        {item.description ? (
          <span
            data-feature-text
            className="mt-0.5 block text-xs leading-relaxed text-ink-muted sm:text-sm"
          >
            {item.description}
          </span>
        ) : null}
      </span>
    </li>
  );
}

/**
 * The hairline rules the Quality comp draws between its six commitment cells.
 *
 * **Three disjoint width bands, not three layers of overrides.** The column
 * count changes at `sm` and again at `lg`, and so does which cell needs a left
 * rule — cell 4 has one at two columns and none at three. Written as `sm:` and
 * `lg:` those are two `border-left-width` declarations on one element in the
 * same media query, and which one lands is decided by the order Tailwind emits
 * its utilities in, not by the order they appear in the class attribute. That
 * is not something a class list can promise.
 *
 * `max-sm` / `sm:max-lg` / `lg` never overlap, so every cell receives exactly
 * one rule per edge at every width and the result is the same whatever order
 * the sheet is written in. `divide-x` cannot do this at all: in two columns it
 * draws a line down the middle of a half-empty final row.
 *
 * Vertical padding is uniform and the edges are not zeroed, which keeps the
 * whole thing independent of how many items an editor publishes — six today,
 * five or eight tomorrow, and no rule dangles.
 */
const RULED = [
  // `px-4`, not `px-6`: at 1024 the three cells share about 520px, so every
  // 8px of cell padding is 8px off a text column that is only ~92px wide to
  // begin with. `[&>*]:min-w-0` for the usual grid-track reason — a long
  // unbroken word in a title would otherwise set the column floor.
  "[&>*]:min-w-0 [&>li]:border-line [&>li]:py-5 sm:[&>li]:px-4",

  // One column: rules between rows only.
  "max-sm:[&>li:not(:first-child)]:border-t",

  // Two columns: a rule down the middle, and above every row after the first.
  "sm:max-lg:[&>li:nth-child(even)]:border-l",
  "sm:max-lg:[&>li:nth-child(n+3)]:border-t",

  // Three columns: a rule left of every cell that does not start a row.
  "lg:[&>li:not(:nth-child(3n+1))]:border-l",
  "lg:[&>li:nth-child(n+4)]:border-t",
].join(" ");

/**
 * A group of them.
 *
 * Renders nothing when the section is empty — every one of these is a set of
 * rows an editor may not have created, and a heading over an empty grid is
 * worse than a section that is simply not there.
 *
 * `ruled`, `tone` and `markClassName` are opt-in and default to what the grid
 * already drew, so the callers that predate them are unaffected.
 */
export function FeatureGrid({
  items,
  columns = "sm:grid-cols-2",
  className,
  ruled = false,
  tone,
  markClassName,
}) {
  if (!items?.length) return null;

  return (
    // `gap-6` and the ruled layout's `gap-0` are the same property, so the
    // gap is chosen rather than overridden — see the note on `RULED`.
    <ul className={cn("grid", ruled ? RULED : "gap-6", columns, className)}>
      {items.map((item) => (
        <FeatureItem key={item.id} item={item} tone={tone} markClassName={markClassName} />
      ))}
    </ul>
  );
}
