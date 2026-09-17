import { readableOn } from "@shared/theme/color.js";

import { CloudinaryImage } from "../CloudinaryImage.jsx";
import { Icon } from "../ui/Icon.jsx";
import { cn } from "../../lib/cn.js";

/**
 * One `FeatureItem` — an icon, a title and a line of description.
 *
 * The same row appears in the home page's USP strip, Quality's commitment grid
 * and the dealer benefits, because it is the same payload each time. It lived
 * inside `UspStrip` until the other sections had an endpoint to read.
 *
 * `icon_bg_color` is a per-item colour an editor chose in the dashboard, so it
 * is applied as data and the glyph colour on top is **computed** rather than
 * assumed white — the live values are the brand green and the gold, and a white
 * glyph on the gold fails AA.
 */
export function FeatureItem({ item, size = 44 }) {
  const background = item.icon_bg_color || undefined;

  return (
    <li className="flex items-start gap-3.5">
      <span
        className={cn("grid shrink-0 place-items-center rounded-full bg-brand-tint text-brand")}
        style={{
          width: size,
          height: size,
          ...(background ? { backgroundColor: background, color: readableOn(background) } : null),
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
          <Icon name={item.icon_name} size={Math.round(size * 0.45)} />
        )}
      </span>

      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{item.title}</span>
        {item.description ? (
          <span className="mt-0.5 block text-sm leading-relaxed text-ink-muted">
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
