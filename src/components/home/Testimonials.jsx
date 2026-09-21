import { Quote } from "lucide-react";
import { useRef, useState } from "react";

import { advance, swipeIntent } from "../../lib/carousel.js";
import { cn } from "../../lib/cn.js";

/**
 * What customers say (§10.1) — `Testimonial` rows from the home payload.
 *
 * **One quote at a time, with dots**, which is what the reference draws — it
 * used to be a three-up grid of cards. Three are published, so the grid was
 * three cards of very different lengths sitting in a row; one at a time gives
 * each the width to be read.
 *
 * No autoplay, for the reason the hero has none: a panel that advances on its
 * own moves the thing someone was reading, and §18's AA bar treats
 * uncontrolled motion as a failure rather than a flourish. Nothing here
 * animates either, so there is no reduced-motion branch to get wrong.
 *
 * `advance` and `swipeIntent` are the hero's, unchanged — wrapping at both ends
 * and deciding whether a drag was a swipe are the two things carousels get
 * wrong, and they are already written and tested once.
 *
 * **The stars are gone**, at the client's request, because the reference has
 * none. `rating` is still set on every row and still returned by the API —
 * nothing was deleted, it is simply not drawn here. Putting it back is the
 * five lines this comment replaced.
 */
export function Testimonials({ testimonials }) {
  const items = testimonials ?? [];
  const [index, setIndex] = useState(0);
  const start = useRef(null);

  if (!items.length) return null;

  const many = items.length > 1;
  const current = items[Math.min(index, items.length - 1)];

  // Pointer events rather than touch, so a trackpad drag and a stylus behave
  // the same way. Mouse is excluded: a drag across text is a selection.
  const onPointerDown = (event) => {
    start.current = event.pointerType === "mouse" ? null : { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event) => {
    const from = start.current;
    start.current = null;
    if (!from) return;

    const direction = swipeIntent(event.clientX - from.x, event.clientY - from.y);
    if (direction) setIndex((i) => advance(i, items.length, direction === "next" ? 1 : -1));
  };

  return (
    // No container, no ground, no rhythm of its own: `VoicesBand` owns all
    // three now, because this is one column of a row rather than a band.
    <section aria-labelledby="testimonials-heading">
      <div>
        {/*
          The eyebrow *is* the heading, rather than an eyebrow above an invented
          one. The reference shows only "What Our Clients Say"; the h2 that used
          to sit under it ("Trusted across Bangladesh") was written here rather
          than by anyone who owns the copy. Making the visible line the heading
          keeps the document outline intact without adding a hidden duplicate
          for a screen reader to read twice.
        */}
        <h2
          id="testimonials-heading"
          className="text-eyebrow font-semibold uppercase tracking-[0.2em] text-brand"
        >
          What Our Clients Say
        </h2>

        {/* Still capped below `xl`, where this is a full-width block rather
            than a third of the row: one quote across a 1232px container is a
            line nobody can track back from. */}
        <div
          className="mt-6 max-w-2xl xl:max-w-none"
          {...(many
            ? { onPointerDown, onPointerUp, onPointerCancel: () => (start.current = null) }
            : null)}
        >
          {/* A pale card on a white band, and no shadow — the reference draws
              it as a quiet panel, not a raised one. It was white-on-white with
              a `shadow-card`, which only read as a card because of the shadow. */}
          <figure className="flex flex-col rounded-xl bg-ground p-6">
            <Quote size={28} strokeWidth={1.75} aria-hidden="true" className="text-brand/30" />

            {/* Keyed on the testimonial so the element is replaced rather than
                mutated — without it a screen reader reading the old quote is
                not told the text under its cursor has changed. */}
            <blockquote key={current.id} className="mt-3 leading-relaxed text-ink">
              {current.quote}
            </blockquote>

            {/* No rule above the attribution, and no stars. Both were here and
                the reference has neither — see the note on `rating` below. */}
            <figcaption className="mt-5">
              <p className="text-sm font-semibold text-ink">
                <span aria-hidden="true">– </span>
                {current.author_name}
              </p>
              {current.author_role ? (
                <p className="text-sm text-ink-muted">{current.author_role}</p>
              ) : null}
            </figcaption>
          </figure>

          {many ? (
            <div className="mt-4 flex items-center justify-center gap-1">
              {items.map((item, i) => (
                /*
                  The span is the 8px dot the reference draws; the button is
                  the target around it. Growing the dot itself to meet 2.5.8
                  would have changed the design — padding it does not.

                  **24×44, and the width is the part that was wrong.** This
                  said "the 44px target" and was 44px in one direction only:
                  4px of padding either side of an 8px dot is 16px wide, and
                  with the 4px gap between them 2.5.8's spacing exemption
                  does not apply either, so three dots 20px apart were
                  failing AA on a phone. 24px is the criterion's minimum met
                  outright.

                  Not a 44px-wide target: that would space the dots 48px
                  apart and turn a tight row of three into a scattered one.
                  24px keeps the design and clears the bar. Same arrangement
                  as the hero's, which had the same bug.
                */
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Show testimonial ${i + 1} of ${items.length}`}
                  aria-current={i === index ? "true" : undefined}
                  onClick={() => setIndex(i)}
                  className="group grid h-11 w-6 place-items-center"
                >
                  <span
                    className={cn(
                      "block size-2 rounded-full transition-colors duration-(--duration-fast)",
                      i === index ? "bg-brand" : "bg-line-strong group-hover:bg-brand-muted",
                    )}
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
