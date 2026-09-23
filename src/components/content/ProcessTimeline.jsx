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
function Step({ step, compact, card, separated }) {
  const image = step.image;

  return (
    <li
      className={cn(
        "relative flex flex-1 flex-col items-center text-center",
        // `min-w-0` rather than a floor: the card variant lays out on a grid
        // with a fixed column count, and a track that refuses to go below
        // 10rem is the classic way a five-column row pushes past the viewport.
        card ? "min-w-0 rounded-lg border border-line bg-surface p-2.5 pb-5" : compact ? "min-w-[7rem]" : "min-w-[10rem]",
      )}
    >
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
        {/*
          The card variant puts it back on the top edge, which is where the
          *Quality* comp draws it — a disc straddling the photograph's upper
          border, clear of the card's own outline. The About comp's reasoning
          above still holds for the other two variants; the difference is that
          a bordered card gives the badge an edge to sit on, where a bare tile
          gave it only the picture to cover.
        */}
        <span
          className={cn(
            card
              ? "absolute -top-4 left-1/2 grid -translate-x-1/2 place-items-center rounded-full bg-brand tabular-nums text-on-brand ring-4 ring-surface"
              : "absolute -bottom-3 left-1/2 grid -translate-x-1/2 place-items-center rounded-full bg-brand tabular-nums text-on-brand ring-4 ring-surface",
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
            // The card variant centres it on the photograph and makes it long
            // enough to cross the card's own padding on both sides as well as
            // the gap between them — `left-full` is the picture's edge, not
            // the card's, and the two are `p-2.5` apart.
            className={cn(
              card
                ? "absolute left-full top-1/2 hidden w-[calc(var(--process-gap)+1.25rem)] -translate-y-1/2 items-center text-brand/70 lg:flex"
                : cn(
                    "absolute bottom-[2px] left-full hidden w-(--process-gap) items-center text-brand/70",
                    compact ? "sm:flex" : "md:flex",
                  ),
            )}
          >
            <span className="h-0 flex-1 border-t-2 border-dotted border-brand/40" />
            <ChevronRight size={14} strokeWidth={2.5} className="-ml-0.5 shrink-0" />
          </span>
        ) : null}
      </div>

      {/* Clears the badge, which now hangs half below the tile — except in the
          card variant, where it hangs off the top and there is nothing under
          the picture to clear. */}
      <h3
        className={cn("font-semibold text-ink", card ? "mt-3 text-sm sm:text-base" : compact ? "mt-6 text-xs" : "mt-8 text-base")}
      >
        {step.title}
      </h3>
      {/* A size down in the compact strip. Five tiles share about 660px there,
          so each is ~119px wide — at 14px "Carefully Sourced" wraps and the
          row grows a line taller than the comp, which sets it around 11px. */}
      {step.description ? (
        <p
          className={cn(
            "mt-1 leading-relaxed text-ink-muted",
            card ? "px-1 text-xs sm:text-sm" : compact ? "text-xs" : "text-sm",
          )}
        >
          {step.description}
        </p>
      ) : null}

    </li>
  );
}

/**
 * The card variant's track.
 *
 * A grid with a declared column count rather than `flex-wrap`, because five
 * across is a layout that has to *stop* being five across — wrapping decides
 * that from content width and produces orphan rows of one at the sizes in
 * between. The steps are five equal cards at every width; only how many share
 * a row changes: 1 → 2 → 3 → 5.
 *
 * `[&>*]:min-w-0` is the grid-child rule this codebase has been bitten by
 * before: a track is `min-width: auto` by default and will not shrink below
 * its content, so without it the fifth column sets the floor and the row
 * scrolls the page sideways.
 *
 * The gap grows with the breakpoint and `--process-gap` follows it, so the
 * connector at `lg` is exactly as wide as the space it crosses. Writing the
 * number twice is how the two drift.
 */
const CARD_TRACK = [
  "grid grid-cols-1 gap-x-4 gap-y-8 pt-4 [&>*]:min-w-0",
  "[--process-gap:1rem]",
  "sm:grid-cols-2",
  "md:grid-cols-3",
  "lg:grid-cols-5 lg:gap-x-6 lg:[--process-gap:1.5rem]",
].join(" ");

export function ProcessTimeline({ steps, compact = false, variant = "default", className }) {
  if (!steps?.length) return null;

  const card = variant === "card";

  return (
    <ol
      className={cn(
        card
          ? CARD_TRACK
          : cn(
              // `--process-gap` is the gutter, declared once and read by each
              // step's connector, so the dotted rule is exactly as wide as the
              // space it has to cross. Writing the number twice is how the two
              // drift.
              "flex flex-wrap items-start justify-center gap-x-6 gap-y-10 [--process-gap:1.5rem]",
              compact ? "sm:flex-nowrap sm:gap-x-4 sm:[--process-gap:1rem]" : "md:flex-nowrap",
            ),
        className,
      )}
    >
      {steps.map((step, index) => (
        <Step
          key={step.id}
          step={step}
          compact={compact}
          card={card}
          separated={index < steps.length - 1}
        />
      ))}
    </ol>
  );
}
