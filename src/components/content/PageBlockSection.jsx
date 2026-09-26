import { ArrowRight, CircleCheck } from "lucide-react";
import { Link } from "react-router";

import { CloudinaryImage } from "../CloudinaryImage.jsx";
import { LeafWatermark } from "./LeafWatermark.jsx";
import { Ornament } from "./Ornament.jsx";
import { RichText } from "./RichText.jsx";
import { SIZES } from "../../lib/cloudinary.js";
import { bulletsOf } from "../../lib/pageContent.js";
import { cn } from "../../lib/cn.js";
import { isExternal } from "../../lib/nav.js";

/**
 * The text column of a `PageBlock`: eyebrow, heading, subheading, body, bullet
 * list, call to action.
 *
 * Shared rather than written per page. The home page's welcome block, About's
 * company block and Quality's commitment block are the same payload
 * (`HomeWelcomeBlock` in the schema) drawn at different widths, and the way to
 * keep them consistent is for there to be one of them.
 */
export function PageBlockBody({ block, headingId, headingLevel = 2, ornament = false, className }) {
  const Heading = headingLevel === 1 ? "h1" : headingLevel === 3 ? "h3" : "h2";
  const bullets = bulletsOf(block);

  return (
    <div className={className}>
      {block.eyebrow ? (
        <p className="text-eyebrow font-semibold uppercase tracking-[0.2em] text-brand">{block.eyebrow}</p>
      ) : null}

      {block.heading ? (
        <Heading id={headingId} className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">
          {block.heading}
        </Heading>
      ) : null}

      {/* Under the heading, above the copy — where the Quality comp draws it.
          Opt-in: About's three blocks have none. `"center"` is the assurance
          band, where the heading is a centred banner line rather than the
          left-aligned opening of a section. */}
      {ornament ? (
        <Ornament align={ornament === "center" ? "center" : "start"} className="mt-5" />
      ) : null}

      {block.subheading ? <p className="mt-3 text-lg text-ink-muted">{block.subheading}</p> : null}

      <RichText html={block.body} className="mt-4 max-w-prose" />

      {bullets.length ? (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {bullets.map((point) => (
            <li key={point} className="flex items-start gap-2.5 text-sm text-ink">
              <CircleCheck size={18} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-brand" />
              {point}
            </li>
          ))}
        </ul>
      ) : null}

      {block.cta_label && block.cta_url ? (
        <div className="mt-8">
          {isExternal(block.cta_url) ? (
            <a
              href={block.cta_url}
              className="inline-flex h-12 items-center gap-2 rounded-md bg-brand px-6 text-sm font-medium text-on-brand hover:bg-brand-dark"
            >
              {block.cta_label}
              <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
            </a>
          ) : (
            <Link
              to={block.cta_url}
              className="inline-flex h-12 items-center gap-2 rounded-md bg-brand px-6 text-sm font-medium text-on-brand transition-colors duration-(--duration-fast) hover:bg-brand-dark"
            >
              {block.cta_label}
              <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
            </Link>
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The gutter wrapper a framed section needs and a flat one does not.
 *
 * Returning the children untouched when `framed` is false keeps the flat
 * section's DOM exactly as it was. About draws two of these, and an extra
 * wrapper element there would be a real layout change bought for a prop that
 * page never passes.
 */
function Frame({ framed, children }) {
  if (!framed) return children;

  return (
    <div className="mx-auto max-w-(--container-max) pl-(--gutter-l) pr-(--gutter-r)">{children}</div>
  );
}

/**
 * A whole page section built from one block — text on one side, its image on
 * the other, as both the About and Quality comps draw it.
 *
 * Renders nothing at all when the block is absent. Every one of these is a row
 * an editor may not have created yet, and an empty heading over an empty column
 * is worse than a section that is simply not there.
 */
export function PageBlockSection({
  block,
  id,
  reversed = false,
  tone = "surface",
  // `{ src, side }`, and opt-in rather than automatic: three sections share
  // this component and only About's "Our Company" is drawn with the art.
  watermark,
  // The Quality comp draws its commitment band as a pale rounded card inset
  // from the gutters, where About draws the same component flat on the page.
  // Opt-in for that reason — the default is the flat band About already has.
  framed = false,
  ornament = false,
  // Merged onto `PageBlockBody`'s root, so a caller can reach the heading with
  // `[&_h2]:…` for a column whose width the block does not know about.
  bodyClassName,
  // The `lg` column split, when neither default suits. The dealer comp gives
  // its text barely a quarter of the row because five cards sit beside it,
  // where About's photograph is happy with 41%.
  split,
  // Rendered under the body, inside the *text* column — `children` is the
  // panel beside it. The dealer comp's brochure button goes here: it belongs
  // with the copy, and it is not a block CTA because the file it points at is
  // resolved separately and the button must not exist when it does not.
  bodyFooter,
  children,
}) {
  if (!block) return null;

  const headingId = id ? `${id}-heading` : undefined;

  return (
    <section
      aria-labelledby={block.heading ? headingId : undefined}
      aria-label={block.heading ? undefined : block.eyebrow || undefined}
      className={cn(
        "py-(--space-section)",
        tone === "ground" ? "bg-ground" : "bg-surface",
        // Only when there is art to contain. `overflow-hidden` on every
        // section would clip the image card's `shadow-card`, and `isolate`
        // would create a stacking context three sections do not need.
        watermark && "relative isolate overflow-hidden",
      )}
    >
      {watermark ? <LeafWatermark src={watermark.src} side={watermark.side} /> : null}

      {/*
        Not two equal columns.

        Measured off the About comp's "Our Company" band: the text runs
        x 80..397 of a 1024-wide frame and the photograph x 490..949, which is
        41% / 59% of the content width with a 116px gutter between them. At
        `grid-cols-2` the text column was half the row and the picture was
        cramped by the same amount.

        `0.7fr 1fr` is that ratio — 0.7/1.7 is 41.2% — and it suits the other
        two users of this component as well: About's "Our Strength" puts five
        process steps in the wide half and Quality's commitment block puts a
        feature grid there, and both were being squeezed into 50%.
      */}
      {/*
        Framed, the gutters move to a wrapper and the card takes their place —
        a card cannot carry the page's gutters as its own padding without the
        two meaning different things at different widths.

        The split is written twice rather than once with an overriding gap: two
        `lg:gap-*` utilities on one element are resolved by their order in
        Tailwind's generated sheet, not by their order in the attribute, so
        "the later one wins" is not something the class list can promise. The
        112px gutter is right between two columns on an open page and far too
        wide inside a card that already has padding.
      */}
      <Frame framed={framed}>
        <div
          className={cn(
            "mx-auto grid max-w-(--container-max) gap-10",
            framed ? "rounded-xl bg-ground p-5 sm:p-8 lg:p-10" : "pl-(--gutter-l) pr-(--gutter-r)",
            (block.image?.url || children) &&
              (split ??
                (framed
                ? // A narrower text column than the flat band's 41%, because
                  // the panel beside it is a three-column grid rather than one
                  // photograph. At 1024 the 0.7 ratio left each of those three
                  // cells about 63px of text after its icon and its rules —
                  // "Advanced Technology" in 63px is five lines. 0.62 and a
                  // 48px gutter give it 92px, which is what the comp draws.
                  "lg:grid-cols-[0.62fr_minmax(0,1fr)] lg:items-center lg:gap-12"
                : "lg:grid-cols-[0.7fr_minmax(0,1fr)] lg:items-center lg:gap-28")),
          )}
        >
        {/* Wrapped only when there is a footer, so the flat and framed
            sections keep the DOM they already had. */}
        {bodyFooter ? (
          <div className={cn(reversed && "lg:order-2")}>
            <PageBlockBody block={block} headingId={headingId} ornament={ornament} className={bodyClassName} />
            {bodyFooter}
          </div>
        ) : (
          <PageBlockBody
            block={block}
            headingId={headingId}
            ornament={ornament}
            className={cn(reversed && "lg:order-2", bodyClassName)}
          />
        )}

        {/* `children` is the panel beside the text — the process strip on
            About's "Our Strength", the feature grid on Quality's commitment.
            When there is none, the block's own image takes the column. */}
        {children ??
          (block.image?.url ? (
            // A 16px radius and a soft shadow, as the comp draws the card —
            // it lifts the photograph off the near-white band rather than
            // letting it sit flat on it. `rounded-xl` was 24px, which on a
            // 575px-wide picture reads as a rounded button rather than a
            // photograph.
            <div
              className={cn("overflow-hidden rounded-lg shadow-card", reversed && "lg:order-1")}
            >
              <CloudinaryImage
                src={block.image.url}
                alt={block.image.alt ?? ""}
                aspectRatio={
                  block.image.width > 0 && block.image.height > 0
                    ? `${block.image.width} / ${block.image.height}`
                    : "4 / 3"
                }
                sizes={SIZES.half}
                className="size-full"
              />
            </div>
          ) : null)}
        </div>
      </Frame>
    </section>
  );
}
