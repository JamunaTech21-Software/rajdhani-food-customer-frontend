import { readableOn } from "@shared/theme/color.js";

import { CloudinaryImage } from "../CloudinaryImage.jsx";
import { Icon } from "../ui/Icon.jsx";

/**
 * The USP strip (§10.1) — `FeatureItem` rows in section `HOME_USP`.
 *
 * In the approved comp this card straddles the bottom edge of the hero rather
 * than sitting below it, which is why it is pulled up by a negative margin and
 * given its own stacking context.
 *
 * `icon_bg_color` is a per-item colour an editor chose in the dashboard, so it
 * is applied as data and the glyph colour on top is **computed** rather than
 * assumed white — the live value is the dark brand green, but the field accepts
 * anything, and a pale choice with a white glyph would be invisible.
 */
function UspItem({ item }) {
  const background = item.icon_bg_color || undefined;

  return (
    <li className="flex items-start gap-3.5">
      <span
        className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-tint text-brand"
        style={
          background
            ? { backgroundColor: background, color: readableOn(background) }
            : undefined
        }
      >
        {/* An uploaded icon wins over a named one — the admin allows either. */}
        {item.icon?.url ? (
          <CloudinaryImage
            src={item.icon.url}
            alt=""
            width={22}
            height={22}
            className="size-[22px]"
            imgClassName="object-contain"
          />
        ) : (
          <Icon name={item.icon_name} size={20} />
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

export function UspStrip({ items }) {
  if (!items?.length) return null;

  return (
    <section aria-label="Why Rajdhani" className="relative z-10 -mt-12 pl-(--gutter-l) pr-(--gutter-r)">
      <ul className="mx-auto grid max-w-(--container-max) gap-6 rounded-xl bg-surface p-6 shadow-modal sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
        {items.map((item) => (
          <UspItem key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}
