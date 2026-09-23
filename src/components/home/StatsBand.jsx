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
export function Stat({ stat, tone = "light", layout = "stacked" }) {
  const { ref, display } = useCountUp(stat.value);
  const dark = tone === "dark";

  /*
    The gallery comp's arrangement: a bare glyph with the figure and its label
    stacked beside it, four across a pale strip. No disc — that band is already
    a panel, and a tinted circle on a tinted panel is a circle nobody can see.

    A branch here rather than a second component, because the part worth
    sharing is the part below: the counting, the observer that starts it, the
    reduced-motion handling and the aria-hidden/sr-only pair. Written twice,
    that pair is what drifts — and when it drifts a screen reader announces
    every frame of the animation.
  */
  if (layout === "inline") {
    return (
      <div ref={ref} className="flex items-center gap-3">
        <Icon name={stat.icon_name} size={30} className="shrink-0 text-brand" />

        <div className="min-w-0">
          <p className="font-display text-xl font-bold leading-none text-brand sm:text-2xl">
            <span aria-hidden="true">{display}</span>
            <span className="sr-only">{stat.value}</span>
          </p>
          <p className="mt-1.5 text-xs leading-snug text-ink-muted sm:text-sm">{stat.label}</p>
        </div>
      </div>
    );
  }

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
      className={cn(
        "py-(--space-section)",
        dark ? "relative isolate bg-brand-dark" : "bg-ground-warm",
      )}
    >
      {/*
        The dark band is a photograph under a green wash, not a flat fill.

        Measured on the comp: across the band, away from the text and the icon
        strokes, the pixels run from rgb(0,32,4) to rgb(105,139,113) — a spread
        of about 107 in every channel, around a mean of rgb(4,70,24). A flat
        colour has a spread of zero, so what is behind it is a picture: rows of
        tea bushes, legible as texture rather than as a scene.

        `bg-brand-dark` stays on the section underneath. It is what the band is
        while the photograph loads, and what it stays if the file ever goes
        missing — the figures are white, so a band that failed to an
        unpainted background would be white on white.

        A fixed asset rather than a banner, for the reason `ProcessBand`
        records: the placement enum has no value for a counter band, so there
        is nothing in the CMS for an editor to set it from. If one is added
        this is the single line that changes.
      */}
      {dark ? (
        <>
          <img
            src="/about-us-stats-band.png"
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            /*
              Anchored low, and the arithmetic is why. The band is about 224px
              in a 1280 container, so `cover` scales the 768x512 source to
              1280x853 and shows only 26% of its height. Centred, that 26% is
              the middle of the picture — the horizon, the sky and the bare
              path running up it — which reads as a photograph someone cropped
              badly rather than as texture.

              `center 80%` samples the bottom instead: close foliage, evenly
              lit, no sky. That is what the comp's band is a picture of.
            */
            className="absolute inset-0 -z-20 size-full object-cover object-[center_80%]"
          />
          {/*
            The wash.

            Measured at this value: the band means rgb(10,65,3) against the
            comp's rgb(4,70,24) — the same depth, and the texture reads the
            same way. The blue the comp has and we do not is not this
            overlay's doing; it is `brand-dark` itself. The comp's green is
            OKLab L=0.341 and `applyTheme` derives ours at L=0.30, which at
            this chroma lands on rgb(0,59,0) with no blue channel at all.
            Matching it exactly means moving that constant, which repaints
            every dark-brand surface on the site, so it is left alone here.

            Contrast checked rather than assumed, because white figures on a
            photograph is exactly where a band like this fails: sampled in the
            gutters, where no glyph can reach, the lightest background pixel
            is rgb(25,78,25). White reads 9.79 against it and the 80% labels
            6.10, both clear of AA. Lower this opacity and that headroom is
            what goes first.
          */}
          <span aria-hidden="true" className="absolute inset-0 -z-10 bg-brand-dark/90" />
        </>
      ) : null}

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
