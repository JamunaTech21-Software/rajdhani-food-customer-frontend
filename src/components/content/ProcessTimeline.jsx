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
    <li className={cn("relative flex flex-1 flex-col items-center text-center", compact ? "min-w-[8rem]" : "min-w-[10rem]")}>
      <div className="relative w-full">
        {image?.url ? (
          <CloudinaryImage
            src={image.url}
            alt={image.alt ?? ""}
            aspectRatio="4 / 3"
            sizes={SIZES.processStep}
            className="size-full overflow-hidden rounded-lg"
          />
        ) : (
          // No seeded row carries an image. A named icon on the brand tint
          // reads as a deliberate mark rather than as a picture that failed.
          <div
            aria-hidden="true"
            className="grid aspect-[4/3] w-full place-items-center rounded-lg bg-brand-tint text-brand"
          >
            <Icon name={step.icon_name} size={compact ? 24 : 32} />
          </div>
        )}

        <span
          className={cn(
            "absolute -top-3 left-1/2 grid -translate-x-1/2 place-items-center rounded-full bg-brand tabular-nums text-on-brand",
            compact ? "size-7 text-xs font-semibold" : "size-9 text-sm font-bold",
          )}
        >
          {step.step_number}
        </span>
      </div>

      <h3 className={cn("mt-4 font-semibold text-ink", compact ? "text-sm" : "text-base")}>
        {step.title}
      </h3>
      {step.description ? (
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">{step.description}</p>
      ) : null}

      {/*
        The separator, drawn inside the step it follows rather than as a sibling
        list item — a list item whose only content is a chevron is an item with
        no content, and a screen reader would count it.

        Decorative: the order is already carried by the numbers and by the list
        being ordered. It appears only once the row stops wrapping, since
        between two stacked cards it would point the wrong way.
      */}
      {separated ? (
        <ChevronRight
          size={20}
          strokeWidth={2}
          aria-hidden="true"
          className={cn(
            "absolute right-0 top-[14%] hidden translate-x-1/2 text-line-strong",
            compact ? "sm:block" : "md:block",
          )}
        />
      ) : null}
    </li>
  );
}

export function ProcessTimeline({ steps, compact = false, className }) {
  if (!steps?.length) return null;

  return (
    <ol
      className={cn(
        "flex flex-wrap items-start justify-center gap-x-6 gap-y-10",
        compact ? "sm:flex-nowrap sm:gap-x-4" : "md:flex-nowrap",
        className,
      )}
    >
      {steps.map((step, index) => (
        <Step key={step.id} step={step} compact={compact} separated={index < steps.length - 1} />
      ))}
    </ol>
  );
}
