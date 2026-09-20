import { Stat } from "./StatsBand.jsx";
import { PageBlockBody } from "../content/PageBlockSection.jsx";
import { cn } from "../../lib/cn.js";

/**
 * "About Us", with the numbers beside it (§10.1).
 *
 * The reference draws these as **one band** — the welcome text and its button
 * on the left, the four counters on the right, a rule between them — where the
 * page had two stacked full-width sections. This is that band.
 *
 * It replaces `WelcomeBlock` on the home page. The text column is
 * `PageBlockBody`, the same renderer the About and Quality pages use for the
 * same `PageBlock` payload, so there is still exactly one place that decides
 * how an eyebrow, a heading, a body and a CTA are drawn.
 *
 * **Either half may be missing, and today one is.** `/public/home` returns
 * `welcome: null` and `/public/page-blocks/home` is empty, while four stats are
 * published — so what this renders right now is the counters alone, across the
 * band, which is what the page showed before. When someone writes the welcome
 * block it becomes the two-column layout the reference draws, with no code
 * change. The split is applied only when there is something on both sides: a
 * rule down the middle of a band with one empty half looks like a bug.
 *
 * `block.image` is deliberately ignored. The reference gives the right-hand
 * column to the numbers, and a block that happens to carry an image has
 * nowhere to put it here — it is still drawn on About and Quality, which is
 * where that field is actually used.
 */
export function AboutBand({ block, stats }) {
  const hasStats = Boolean(stats?.length);
  const hasText = Boolean(block);

  // One flag rather than two conditions, so the guard reads the way the other
  // bands' do.
  const anything = hasText || hasStats;
  if (!anything) return null;

  const split = hasText && hasStats;

  return (
    <section
      // Named by the block's own heading where there is one, and by a fixed
      // label where the band is only numbers — the About page shows a second
      // stats band, and two landmarks with one name cannot be told apart.
      aria-labelledby={block?.heading ? "about-band-heading" : undefined}
      aria-label={block?.heading ? undefined : "Rajdhani by the numbers"}
      className="relative isolate overflow-hidden bg-ground-warm py-(--space-section)"
    >
      {/*
        The reference's leaf watermark: pale tea leaves in the bottom-left and
        top-right corners of the band, behind everything.

        A plain `<img>`, not `CloudinaryImage` — this is a local file, and the
        srcset machinery has nothing to negotiate. Absolutely positioned, so it
        contributes no layout and cannot shift the text as it arrives.

        `loading="lazy"` because the band is the fourth on the page and well
        below the fold. It is also why `bg-ground-warm` stays underneath: on a
        slow connection the band is that colour first and the leaves fade in
        over it, which is nearly invisible because the artwork's own base tone
        is within a shade of the token.
      */}
      <img
        src="/home-about-us.png"
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="absolute inset-0 -z-10 size-full object-cover"
      />

      <div
        className={cn(
          "mx-auto grid max-w-(--container-max) gap-10 pl-(--gutter-l) pr-(--gutter-r)",
          split && "lg:grid-cols-2 lg:items-center lg:gap-14",
        )}
      >
        {hasText ? <PageBlockBody block={block} headingId="about-band-heading" /> : null}

        {hasStats ? (
          <div
            className={cn(
              "grid grid-cols-2 gap-8 md:grid-cols-4",
              // The rule only exists when there is something on both sides of
              // it, and only once the two are actually side by side.
              split && "lg:border-l lg:border-line lg:pl-14",
            )}
          >
            {stats.map((stat) => (
              <Stat key={stat.id} stat={stat} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
