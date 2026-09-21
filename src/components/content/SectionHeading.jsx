import { cn } from "../../lib/cn.js";

/**
 * The centred eyebrow + heading + rule above a group of items.
 *
 * Both fields come from an optional `PageBlock` where one exists, falling back
 * to a structural label. That is the same arrangement as `PageHero`'s title: a
 * page needs a heading over a section whether or not an editor has written one,
 * and a section that stays invisible until someone creates a block for it is a
 * section nobody knows to create a block for. Everything an editor writes wins.
 *
 * It means the acceptance criterion holds in the direction that matters — these
 * headings *are* editable from Page Content — without the page falling apart
 * before anyone has been there.
 */
export function SectionHeading({ block, id, eyebrow, heading, subheading, align = "center" }) {
  const text = block?.heading || heading;
  const above = block?.eyebrow ?? eyebrow;
  const below = block?.subheading ?? subheading;

  if (!text) return null;

  /*
    `align="start"` is the About comp's certifications band, where the heading
    sits in a column beside the cards rather than centred above them. The rule
    goes with it: centred under a centred heading it reads as punctuation,
    left-aligned under a left-aligned one it reads as an underline that stops
    too early. The comp draws none there.
  */
  const start = align === "start";

  return (
    <div className={start ? "text-left" : "text-center"}>
      {above ? (
        <p className="text-eyebrow font-semibold uppercase tracking-[0.2em] text-brand">{above}</p>
      ) : null}

      <h2 id={id} className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">
        {text}
      </h2>

      {start ? null : (
        <span aria-hidden="true" className="mx-auto mt-4 block h-0.5 w-16 bg-gold" />
      )}

      {below ? (
        <p className={cn("mt-4 max-w-2xl text-ink-muted", start ? null : "mx-auto")}>{below}</p>
      ) : null}
    </div>
  );
}
