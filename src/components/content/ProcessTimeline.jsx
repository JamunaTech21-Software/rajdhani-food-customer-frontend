import { ChevronRight } from "lucide-react";

import { CloudinaryImage } from "../CloudinaryImage.jsx";
import { Icon } from "../ui/Icon.jsx";
import { SIZES } from "../../lib/cloudinary.js";
import { cn } from "../../lib/cn.js";

/**
 * A numbered process — `ProcessStep` rows in one group (§10.4).
 *
 * Two sections use it: About's "Modern Manufacturing" strip and Quality's
 * five-step process. They are the same payload drawn at two sizes, which is why
 * `compact` is a prop rather than a second component.
 *
 * `step_number` is read from the row, not from the array index. The column is
 * unique per group in the database and an editor reordering steps changes it —
 * numbering from the index would renumber a step the moment another was
 * inserted above it.
 */
function Step({ step, compact, separated }) {
  const image = step.image;

  return (
    <li className={cn("relative flex flex-1 flex-col items-center text-center", compact ? "min-w-[7rem]" : "min-w-[10rem]")}>
      <div className="relative w-full">
        {image?.url ? (
          <CloudinaryImage
            src={image.url}
            alt={image.alt ?? ""}
            // Square in the compact strip, as the About comp draws it — its
            // tiles measure 133x124, an aspect of 1.07. The roomier variant on
            // Quality keeps 4:3, where the tile is wide enough for it to read
            // as a photograph rather than a thumbnail.
            aspectRatio={compact ? "1 / 1" : "4 / 3"}
            sizes={SIZES.processStep}
            className="size-full overflow-hidden rounded-lg"
          />
        ) : (
          // No seeded row carries an image. A named icon on the brand tint
          // reads as a deliberate mark rather than as a picture that failed.
          <div
            aria-hidden="true"
            className={cn(
              "grid w-full place-items-center rounded-lg bg-brand-tint text-brand",
              compact ? "aspect-square" : "aspect-[4/3]",
            )}
          >
            <Icon name={step.icon_name} size={compact ? 24 : 32} />
          </div>
        )}

        {/*
          Below the photograph, straddling its lower edge — which is where the
          About comp puts it, centred about 14px under the tile. It used to sit
          on the top edge, where it covered the first thing in the picture and
          read as a badge *on* the photo rather than a step number under it.
        */}
        <span
          className={cn(
            "absolute -bottom-3 left-1/2 grid -translate-x-1/2 place-items-center rounded-full bg-brand tabular-nums text-on-brand ring-4 ring-surface",
            compact ? "size-7 text-xs font-semibold" : "size-9 text-sm font-bold",
          )}
        >
          {step.step_number}
        </span>

        {/*
          The connector, in the same coordinate space as the badge so the two
          line up without arithmetic: the badge is `-bottom-3` on a 28px disc,
          so its centre sits 2px above this wrapper's lower edge, and so does
          this.

          Drawn inside the step it leads away from rather than as a sibling
          list item — an item whose only content is a rule is an item with no
          content, and a screen reader would count it as a sixth step. The
          order is already carried by the numbers and by the list being
          ordered, so it is decorative. It appears only once the row stops
          wrapping, since between two stacked cards it would point nowhere.
        */}
        {separated ? (
          <span
            aria-hidden="true"
            className={cn(
              "absolute bottom-[2px] left-full hidden w-(--process-gap) items-center text-brand/70",
              compact ? "sm:flex" : "md:flex",
            )}
          >
            <span className="h-0 flex-1 border-t-2 border-dotted border-brand/40" />
            <ChevronRight size={14} strokeWidth={2.5} className="-ml-0.5 shrink-0" />
          </span>
        ) : null}
      </div>

      {/* Clears the badge, which now hangs half below the tile. */}
      <h3 className={cn("font-semibold text-ink", compact ? "mt-6 text-xs" : "mt-8 text-base")}>
        {step.title}
      </h3>
      {/* A size down in the compact strip. Five tiles share about 660px there,
          so each is ~119px wide — at 14px "Carefully Sourced" wraps and the
          row grows a line taller than the comp, which sets it around 11px. */}
      {step.description ? (
        <p className={cn("mt-1 leading-relaxed text-ink-muted", compact ? "text-xs" : "text-sm")}>
          {step.description}
        </p>
      ) : null}

    </li>
  );
}

export function ProcessTimeline({ steps, compact = false, className }) {
  if (!steps?.length) return null;

  return (
    <ol
      className={cn(
        // `--process-gap` is the gutter, declared once and read by each step's
        // connector, so the dotted rule is exactly as wide as the space it
        // has to cross. Writing the number twice is how the two drift.
        "flex flex-wrap items-start justify-center gap-x-6 gap-y-10 [--process-gap:1.5rem]",
        compact ? "sm:flex-nowrap sm:gap-x-4 sm:[--process-gap:1rem]" : "md:flex-nowrap",
        className,
      )}
    >
      {steps.map((step, index) => (
        <Step key={step.id} step={step} compact={compact} separated={index < steps.length - 1} />
      ))}
    </ol>
  );
}
