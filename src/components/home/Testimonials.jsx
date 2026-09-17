import { Quote, Star } from "lucide-react";

import { cn } from "../../lib/cn.js";

function Rating({ value }) {
  const rounded = Math.round(Number(value) || 0);
  if (rounded <= 0) return null;

  return (
    <span className="flex gap-0.5">
      <span className="sr-only">{rounded} out of 5</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={14}
          aria-hidden="true"
          className={cn("shrink-0", n <= rounded ? "fill-gold text-gold" : "text-line-strong")}
        />
      ))}
    </span>
  );
}

/**
 * What customers say (§10.1) — `Testimonial` rows from the home payload.
 *
 * Not in RTPP-59's scope list, but it is in the payload and in the approved
 * comp, so leaving it out would mean shipping a home page the client has
 * already signed off without one of its bands.
 */
export function Testimonials({ testimonials }) {
  if (!testimonials?.length) return null;

  return (
    <section aria-labelledby="testimonials-heading" className="bg-ground py-(--space-section)">
      <div className="mx-auto max-w-(--container-max) pl-(--gutter-l) pr-(--gutter-r)">
        <p className="text-eyebrow font-semibold uppercase tracking-[0.2em] text-brand">
          What Our Clients Say
        </p>
        <h2 id="testimonials-heading" className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">
          Trusted across Bangladesh
        </h2>

        <ul className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((item) => (
            <li key={item.id}>
              <figure className="flex h-full flex-col rounded-xl bg-surface p-6 shadow-card">
                <Quote size={22} strokeWidth={1.75} aria-hidden="true" className="text-brand-tint" />

                <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-ink">
                  {item.quote}
                </blockquote>

                <figcaption className="mt-5 border-t border-line pt-4">
                  <Rating value={item.rating} />
                  <p className="mt-2 text-sm font-semibold text-ink">{item.author_name}</p>
                  {item.author_role ? (
                    <p className="text-sm text-ink-muted">{item.author_role}</p>
                  ) : null}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
