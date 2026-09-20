import { Icon } from "../ui/Icon.jsx";

/**
 * One step: a marked circle, a title, a line or two of description.
 *
 * The connector is drawn **inside the step it leads away from**, not as a
 * sibling. A list item whose only content is a rule is an item with no content,
 * and a screen reader would count it as a sixth step. It is `aria-hidden` for
 * the same reason the numbers are absent from the reference at all: the order
 * is already carried by the list being ordered.
 *
 * `left-1/2 -right-1/2` spans this step's centre to the next one's, because the
 * grid tracks are equal. It appears only at `lg`, where the five sit in one
 * row — between two stacked steps a horizontal rule would point nowhere.
 */
function Step({ step, connected }) {
  return (
    <li className="relative flex flex-col items-center px-2 text-center">
      {/* Green, not grey. The reference's connector reads as part of the mark
          it joins; `border-line-strong` made it a neutral hairline that looked
          like a table rule between the steps. */}
      {connected ? (
        <span
          aria-hidden="true"
          className="absolute left-1/2 -right-1/2 top-6 hidden border-t-2 border-dotted border-brand/40 lg:block"
        />
      ) : null}

      {/*
        White inside a green ring, which is how the reference draws it — not a
        filled mint disc. The fill was `bg-brand-tint` with a ring at 10%, so
        the outline was all but invisible and each step read as a soft blob
        rather than as a mark on the line running through it.

        The fill still has to be opaque: it is what stops the dotted rule
        showing through the circle.
      */}
      <span className="relative z-10 grid size-12 place-items-center rounded-full border border-brand/40 bg-surface text-brand">
        <Icon name={step.icon_name} size={22} />
      </span>

      <h3 className="mt-4 text-sm font-semibold text-ink">{step.title}</h3>

      {/* A size down from the title, as the reference sets it — at the same
          size the two ran together and the row read as five paragraphs. */}
      {step.description ? (
        <p className="mt-1 text-xs leading-relaxed text-balance text-ink-muted">
          {step.description}
        </p>
      ) : null}
    </li>
  );
}

/**
 * "From Garden To Your Cup" (§10.1) — `ProcessStep` rows in group
 * `FROM_GARDEN_TO_CUP`.
 *
 * This band was missing from the home page until now, and the reason recorded
 * in `HomePage` — that `ProcessStep` had no public endpoint — stopped being
 * true when RTPP-67 shipped `GET /public/process-steps`. Five steps are
 * published against this group today.
 *
 * **Not `ProcessTimeline`.** That component draws the same payload for About
 * and Quality as numbered cards with 4:3 image tiles and chevrons between them.
 * The reference draws something else — a small circle, a dotted rule, no
 * numbers — and bending one component to do both with a flag would leave every
 * future change to either page having to reason about the other. The shared
 * thing here is the *payload*, which is `ProcessStep` either way; see
 * `homepage-plan.md` H4 if the client later wants this style everywhere.
 *
 * The photograph bleeds off the right edge, as the reference draws it. It is a
 * fixed asset rather than a field: `ProcessStep.image` is per-step, and the
 * banner placement enum has no `HOME_PROCESS`, so there is nothing in the CMS
 * for an editor to set it from. If one is ever added this is the single line
 * that changes.
 *
 * Content left, photograph right, **from `lg`**. Below that the photograph is
 * hidden and the five steps take the whole container.
 */
export function ProcessBand({ steps }) {
  if (!steps?.length) return null;

  return (
    <section aria-labelledby="process-heading" className="relative overflow-hidden py-(--space-section)">
      {/*
        Real alt text, unlike the About band's watermark: this is a photograph
        of someone picking tea, not an ornament, and it says something the five
        steps beside it do not — where the leaves come from and who picks them.
        An empty alt would be right for a border flourish and is not right for
        this.

        `top-(--space-section)` is the same value as the section's own top
        padding, so the photograph's top edge lands exactly where "OUR
        PROCESS" does rather than squaring up against the band above. It runs
        to `bottom-0`, so it still bleeds to the band's lower edge.

        Reading the token rather than repeating a number is what keeps the two
        aligned: `--space-section` steps 48 → 80 → 112px across breakpoints,
        and a hardcoded offset matched it at none of them.

        `object-right`, and the anchoring matters: the column is portrait
        (352×479 at `xl`) and the source is 1942×809, so `cover` scales to the
        *height* and crops only the width — about a third of it. Centred, that
        would be x=32%–68% of the photograph and the picker is at x=64%–100%,
        so she was cropped out entirely and the band showed blurred bushes.

        The corollary is worth recording, because it looks like a missed
        opportunity: since the crop is horizontal only, **the whole height of
        the photograph is already on screen** and a vertical anchor —
        `object-right bottom`, `right 70%` — does nothing at all here.

        Lazy, because the band is fifth on the page and the image is not
        rendered at all below `lg`.
      */}
      <img
        src="/home-our-process-right.png"
        alt="A tea picker gathering fresh leaves into a basket on a hillside garden"
        loading="lazy"
        decoding="async"
        /*
          The width is measured from the *container*, not from the viewport.
          `(100vw - min(100vw, 1280px)) / 2` is the margin outside the capped
          container, and the rem on top is how far the photo reaches back
          inside it. So its left edge sits a constant distance from the text at
          every width, instead of drifting further away the wider the screen
          gets.
        */
        className="fade-in-from-left absolute bottom-0 right-0 top-(--space-section) hidden object-cover object-right lg:block lg:w-[calc((100vw-min(100vw,1280px))/2+16rem)] xl:w-[calc((100vw-min(100vw,1280px))/2+22rem)]"
      />

      {/*
        The text is held off the photo with `max-width`, not with padding.
        Percentage *padding* resolves against the containing block — the
        full-bleed section — so `pr-[32%]` was 32% of the viewport: 614px at
        1920, which squeezed the steps into a narrow column and left a gulf
        between them and the photograph. A percentage `max-width` on a child
        resolves against this container's own content box, which is capped at
        1280, so the reserve is the same at every width above it.
      */}
      <div className="relative mx-auto max-w-(--container-max) pl-(--gutter-l) pr-(--gutter-r)">
        <div className="lg:max-w-[calc(100%-18rem)] xl:max-w-[calc(100%-24rem)]">
          <p className="text-eyebrow font-semibold uppercase tracking-[0.2em] text-brand">
            Our Process
          </p>
          <h2 id="process-heading" className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">
            From Garden To Your Cup
          </h2>

          {/* The gap tightens at `lg`, where the five share a column narrower
              than the container — at `gap-x-6` each step would be under 110px
              and every title would break mid-word. */}
          <ol className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 lg:gap-x-4 xl:gap-x-6">
            {steps.map((step, index) => (
              <Step key={step.id} step={step} connected={index < steps.length - 1} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
