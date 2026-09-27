import { Check } from "lucide-react";

import { Ornament } from "../content/Ornament.jsx";
import { bulletsOf } from "../../lib/pageContent.js";

/**
 * "Dealer / Distributor Requirements" — the dark panel beside the form.
 *
 * A `PageBlock` whose bullet list is the content, drawn as ticks on the deep
 * brand green. `PageBlockBody` would render those bullets as a two-column list
 * under the text, which is not this; here the list *is* the section.
 *
 * **The tea sapling is the client's own artwork**, anchored to the panel's
 * lower right where the comp draws it. It is not a `LeafWatermark`: that one
 * is a pale sprig for a pale band and anchors to the top or middle, and this
 * is a photograph on a dark ground that has to sit in a corner.
 *
 * It is also not transparent — a 24-bit PNG whose background is #024320, a
 * shade brighter than `--color-brand-deep`. Left alone its top and left edges
 * would be a visible rectangle on the panel. The scrim over it is the panel's
 * own colour fading out towards the corner the plant grows from, so the two
 * greens never meet at a line. A token rather than a matched literal, so it
 * follows the brand if an admin changes it.
 */
export function RequirementsPanel({ block }) {
  if (!block) return null;

  const requirements = bulletsOf(block);
  if (requirements.length === 0) return null;

  return (
    <section
      aria-labelledby="dealer-requirements-heading"
      className="relative isolate h-full overflow-hidden rounded-xl bg-brand-deep p-6 sm:p-8"
    >
      {/*
        Decorative, so `alt=""` and `aria-hidden`. Measured off the comp: the
        plant fills about 46% of the panel's width from the bottom-right, and
        the asset is very nearly square, which puts it at 58% of the height —
        the proportion the reference draws.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 -z-10 w-[48%] max-w-[14rem]"
      >
        <img
          src="/dealer-requirements-leaves.png"
          alt=""
          width={1234}
          height={1274}
          loading="lazy"
          decoding="async"
          className="block h-auto w-full"
        />
        <span className="absolute inset-0 bg-gradient-to-tl from-transparent from-35% to-brand-deep to-92%" />
      </div>

      <div className="relative">
        <h2
          id="dealer-requirements-heading"
          className="font-display text-xl font-bold text-ink-inverse sm:text-2xl"
        >
          {block.heading ?? "Dealer / Distributor Requirements"}
        </h2>

        {/* Wider than the default 13rem: the comp runs the rule to about two
            thirds of the panel, which is 275px at this width. */}
        <Ornament className="mt-4 max-w-[17rem]" />

        <ul className="mt-6 space-y-4">
          {requirements.map((requirement) => (
            <li key={requirement} className="flex items-start gap-3 text-sm text-ink-inverse">
              {/*
                A filled disc with a white tick, not an outlined `CircleCheck`.
                The comp's mark samples #3F701F against a #01280D panel — a
                solid mid-green that reads at a glance, where an outline in the
                brand's own dark green would nearly vanish into the ground.
                `brand-muted` is the token nearest that lightness.
              */}
              <span className="mt-px grid size-5 shrink-0 place-items-center rounded-full bg-brand-muted text-on-brand">
                <Check size={12} strokeWidth={3} aria-hidden="true" />
              </span>
              {requirement}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
