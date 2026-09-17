import { Icon } from "../ui/Icon.jsx";
import { useCountUp } from "../../hooks/useCountUp.js";

function Stat({ stat }) {
  const { ref, display } = useCountUp(stat.value);

  return (
    <div ref={ref} className="flex flex-col items-center text-center">
      <span className="grid size-12 place-items-center rounded-full bg-brand-tint text-brand">
        <Icon name={stat.icon_name} size={22} />
      </span>

      {/*
        aria-hidden on the animating number, with the real value in a visually
        hidden sibling. A screen reader would otherwise announce every frame of
        the count — "one, four, nine, seventeen…" — which is unusable. The
        static text is what gets read; the animation is decoration.
      */}
      <p className="mt-4 font-display text-3xl font-bold text-brand sm:text-4xl">
        <span aria-hidden="true">{display}</span>
        <span className="sr-only">{stat.value}</span>
      </p>

      <p className="mt-1 text-sm text-ink-muted">{stat.label}</p>
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
export function StatsBand({ stats, label = "Rajdhani by the numbers" }) {
  if (!stats?.length) return null;

  return (
    // The label is a prop because About shows a second band from a different
    // group, and two landmarks with one name are two landmarks a screen reader
    // cannot tell apart.
    <section aria-label={label} className="bg-ground-warm py-(--space-section)">
      <div className="mx-auto grid max-w-(--container-max) grid-cols-2 gap-8 pl-(--gutter-l) pr-(--gutter-r) md:grid-cols-4">
        {stats.map((stat) => (
          <Stat key={stat.id} stat={stat} />
        ))}
      </div>
    </section>
  );
}
