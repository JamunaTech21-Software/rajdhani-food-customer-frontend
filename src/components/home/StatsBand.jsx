import { Icon } from "../ui/Icon.jsx";
import { cn } from "../../lib/cn.js";
import { useCountUp } from "../../hooks/useCountUp.js";

/**
 * One counter.
 *
 * Exported because `AboutBand` lays four of them out beside the welcome text
 * rather than across a band of their own, and the counting, the observer and
 * the screen-reader arrangement below should exist once. The *band* stays here
 * because the About page still renders one from group `ABOUT`.
 */
export function Stat({ stat, tone = "light" }) {
  const { ref, display } = useCountUp(stat.value);
  const dark = tone === "dark";

  return (
    <div ref={ref} className="flex flex-col items-center text-center">
      {/*
        Filled on a pale band, outlined on a dark one. The tint is a *light*
        colour, so on the About comp's green it would read as a white disc with
        a green glyph — the opposite of the ring the comp draws.
      */}
      <span
        className={cn(
          "grid size-12 place-items-center rounded-full",
          dark ? "border border-ink-inverse/40 text-ink-inverse" : "bg-brand-tint text-brand",
        )}
      >
        <Icon name={stat.icon_name} size={22} />
      </span>

      {/*
        aria-hidden on the animating number, with the real value in a visually
        hidden sibling. A screen reader would otherwise announce every frame of
        the count — "one, four, nine, seventeen…" — which is unusable. The
        static text is what gets read; the animation is decoration.
      */}
      <p
        className={cn(
          "mt-4 font-display text-3xl font-bold sm:text-4xl",
          dark ? "text-ink-inverse" : "text-brand",
        )}
      >
        <span aria-hidden="true">{display}</span>
        <span className="sr-only">{stat.value}</span>
      </p>

      <p className={cn("mt-1 text-sm", dark ? "text-ink-inverse/80" : "text-ink-muted")}>
        {stat.label}
      </p>
    </div>
  );
}

/**
 * The stats band (§10.1) — `StatCounter` rows in group `HOME`.
 *
 * Each number counts up when it scrolls into view, once, and not at all for
 * anyone who has asked for reduced motion. See `useCountUp` for why that last
 * one is handled by showing the final value rather than by skipping the render.
 */
export function StatsBand({ stats, label = "Rajdhani by the numbers", tone = "light" }) {
  if (!stats?.length) return null;

  const dark = tone === "dark";

  return (
    /*
      The label is a prop because About shows a second band from a different
      group, and two landmarks with one name are two landmarks a screen reader
      cannot tell apart.

      `tone` is the About comp's band: dark green, white figures, hairline
      dividers between the four. The home page's stays pale — its own comp
      draws green figures on a tint, beside the welcome text. Sampled off the
      About comp the green is #024517, which is `brand-dark` (#144a18) rather
      than `brand` or the much darker `brand-deep`.

      The dividers are `divide-x` on the row rather than a border per item, for
      the reason `UspStrip` records at length: at two columns the third item
      starts a row, and a left border there draws a line down the middle of
      nothing. So they wait for the single row at `md`.
    */
    <section
      aria-label={label}
      className={cn("py-(--space-section)", dark ? "bg-brand-dark" : "bg-ground-warm")}
    >
      <div
        className={cn(
          "mx-auto grid max-w-(--container-max) grid-cols-2 gap-8 pl-(--gutter-l) pr-(--gutter-r) md:grid-cols-4",
          dark && "md:gap-0 md:divide-x md:divide-ink-inverse/20 [&>*]:md:px-6",
        )}
      >
        {stats.map((stat) => (
          <Stat key={stat.id} stat={stat} tone={tone} />
        ))}
      </div>
    </section>
  );
}
