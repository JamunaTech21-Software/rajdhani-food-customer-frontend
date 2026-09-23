import { Leaf } from "lucide-react";

import { cn } from "../../lib/cn.js";

/**
 * The comp's small gold flourish — a leaf between two hairlines.
 *
 * It appears twice on Quality: between the banner's two paragraphs and under
 * the commitment heading. One component rather than two copies, because the
 * two are the same mark at the same size and a flourish that is 16px on one
 * section and 18px on the next reads as a mistake rather than a variation.
 *
 * `aria-hidden` and no text: it is punctuation between two blocks of copy, and
 * a screen reader announcing a leaf between them is noise. It carries no
 * meaning that the spacing does not already carry.
 *
 * `align` decides whether it is centred under a centred heading or sits at the
 * start of a left-aligned column — the same distinction `SectionHeading` draws,
 * and for the same reason: a centred rule under left-aligned text reads as an
 * underline that begins in the wrong place.
 */
export function Ornament({ align = "start", className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex w-full max-w-[13rem] items-center gap-3 text-gold",
        align === "center" && "mx-auto",
        className,
      )}
    >
      <span className="h-px flex-1 bg-gold/45" />
      <Leaf size={16} strokeWidth={1.75} className="-rotate-45 shrink-0" />
      <span className="h-px flex-1 bg-gold/45" />
    </span>
  );
}
