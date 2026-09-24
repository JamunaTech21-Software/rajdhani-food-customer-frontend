import { Icon } from "../ui/Icon.jsx";
import { RichText } from "../content/RichText.jsx";
import { Stat } from "../home/StatsBand.jsx";

/**
 * The gallery's closing strip — "Capturing Quality, Delivering Trust".
 *
 * A pale rounded panel: a mark and a short statement on the left, four counters
 * on the right, hairline-ruled between them. It is the last thing the comp
 * draws before the footer.
 *
 * **Both halves are editable and either may be absent.** The words are a
 * `PageBlock` under page key `gallery`; the figures are `StatCounter` rows in
 * group `GALLERY`. Neither had a reader before this component existed — the
 * admin has offered the `GALLERY` stat group all along, so an editor could add
 * all four counters and watch nothing appear. That is the same trap the
 * `GALLERY_HERO` banner was in.
 *
 * Nothing renders when both are empty. A panel containing a heading and no
 * numbers, or four numbers and no heading, is still worth drawing — a section
 * an editor has half-filled should show the half they filled — but an empty
 * one is a rounded rectangle with nothing in it.
 */
export function GalleryHighlight({ block, stats }) {
  const counters = stats ?? [];
  if (!block && counters.length === 0) return null;

  const heading = block?.heading;

  return (
    <section
      aria-labelledby={heading ? "gallery-highlight-heading" : undefined}
      aria-label={heading ? undefined : "Rajdhani in numbers"}
      // No rhythm of its own. It sits inside the gallery's container, under a
      // grid that already carries `py-8`, and the container's own bottom
      // padding closes the page — a section margin here would be a third
      // helping of the same gap.
    >
      {/*
        `lg:items-center` with the text given the narrower track: measured off
        the comp the statement runs to about 40% of the panel and the four
        counters take the rest, which is 1 to 1.35.
      */}
      {/* `p-5 sm:p-6 lg:p-8` — the site's card padding, which starts narrow and
          grows. A panel padded only for a desktop takes 64px off a 328px
          phone. */}
      <div className="rounded-xl bg-ground p-5 sm:p-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:items-center lg:gap-10 lg:p-8">
        <div className="flex items-start gap-4">
          {/*
            Decorative, and named rather than uploaded: the comp draws a photo
            glyph on a mint disc, which is a fixed mark for a fixed section
            rather than anything an editor chooses. A `PageBlock` carries no
            icon field, so making it editable would mean inventing one.
          */}
          <span
            aria-hidden="true"
            className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-tint text-brand sm:size-14"
          >
            <Icon name="image" size={24} />
          </span>

          <div className="min-w-0">
            {heading ? (
              <h2
                id="gallery-highlight-heading"
                className="font-display text-xl font-bold text-brand sm:text-2xl"
              >
                {heading}
              </h2>
            ) : null}

            {/* `max-w-prose` because this column is narrow at `lg` but the full
                container width below it, where an unbounded line is 1200px of
                text nobody tracks back from. */}
            <RichText html={block?.body} className="mt-2 max-w-prose text-sm" />
          </div>
        </div>

        {counters.length ? (
          /*
            `divide-x` only from `lg`, where the four share one row. Below it
            they wrap to two columns and a rule down the middle of a two-up
            grid draws a line between items that are not a pair — the same
            reason the USP strip names its rules by position instead.
          */
          <ul className="mt-7 grid grid-cols-2 gap-x-5 gap-y-6 lg:mt-0 lg:grid-cols-4 lg:gap-x-0 lg:divide-x lg:divide-line [&>*]:min-w-0">
            {counters.map((stat) => (
              <li key={stat.id} className="lg:px-5 lg:first:pl-0 lg:last:pr-0">
                <Stat stat={stat} layout="inline" />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
