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
 * A group of them.
 *
 * Renders nothing when the section is empty — every one of these is a set of
 * rows an editor may not have created, and a heading over an empty grid is
 * worse than a section that is simply not there.
 */
export function FeatureGrid({ items, columns = "sm:grid-cols-2", className }) {
  if (!items?.length) return null;

  return (
    <ul className={cn("grid gap-6", columns, className)}>
      {items.map((item) => (
        <FeatureItem key={item.id} item={item} />
      ))}
    </ul>
  );
}
