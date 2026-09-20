import { ArrowRight, CircleCheck } from "lucide-react";
import { Link } from "react-router";

import { CloudinaryImage } from "../CloudinaryImage.jsx";
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
export function PageBlockBody({ block, headingId, headingLevel = 2, className }) {
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
 * A whole page section built from one block — text on one side, its image on
 * the other, as both the About and Quality comps draw it.
 *
 * Renders nothing at all when the block is absent. Every one of these is a row
 * an editor may not have created yet, and an empty heading over an empty column
 * is worse than a section that is simply not there.
 */
export function PageBlockSection({ block, id, reversed = false, tone = "surface", children }) {
  if (!block) return null;

  const headingId = id ? `${id}-heading` : undefined;

  return (
    <section
      aria-labelledby={block.heading ? headingId : undefined}
      aria-label={block.heading ? undefined : block.eyebrow || undefined}
      className={cn("py-(--space-section)", tone === "ground" ? "bg-ground" : "bg-surface")}
    >
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
      <div
        className={cn(
          "mx-auto grid max-w-(--container-max) gap-10 pl-(--gutter-l) pr-(--gutter-r)",
          (block.image?.url || children) &&
            "lg:grid-cols-[0.7fr_1fr] lg:items-center lg:gap-28",
        )}
      >
        <PageBlockBody block={block} headingId={headingId} className={cn(reversed && "lg:order-2")} />

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
    </section>
  );
}
