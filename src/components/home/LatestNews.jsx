import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

import { CloudinaryImage } from "../CloudinaryImage.jsx";
import { SIZES } from "../../lib/cloudinary.js";
import { formatDate, toDateTimeAttribute } from "../../lib/format.js";

/**
 * Latest updates (§10.1) — the three most recent published posts.
 *
 * Dates go through `formatDate`, which normalises the API's space-separated
 * timestamps. `new Date("2026-09-13 08:34:28.127")` parses in V8 and returns
 * Invalid Date in Safari, so the naive version renders correctly everywhere the
 * developer looks and breaks on every iPhone.
 */
export function LatestNews({ posts }) {
  if (!posts?.length) return null;

  return (
    // No container, no rhythm: `VoicesBand` owns both, because this is two
    // thirds of a row rather than a band of its own.
    <section aria-labelledby="news-heading">
      <div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            {/*
              The eyebrow *is* the heading, as on the testimonials beside it.
              "From the garden and the factory" was written here rather than by
              anyone who owns the copy, and the reference shows no line under
              the eyebrow. Making the visible line the heading keeps the
              document outline without a hidden duplicate (R3).
            */}
            <h2
              id="news-heading"
              className="text-eyebrow font-semibold uppercase tracking-[0.2em] text-brand"
            >
              Latest News &amp; Updates
            </h2>
          </div>

          <Link
            to="/news"
            className="inline-flex h-11 items-center gap-2 rounded-md border border-line px-5 text-sm font-medium text-ink transition-colors duration-(--duration-fast) hover:border-brand hover:text-brand"
          >
            View All News
            <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>

        <ul className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.slug}>
              <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface">
                <div className="aspect-[16/9] overflow-hidden bg-ground">
                  <CloudinaryImage
                    src={post.cover_image?.url}
                    alt={post.cover_image?.alt ?? ""}
                    sizes={SIZES.homeNewsCard}
                    className="size-full transition-transform duration-(--duration-slow) group-hover:scale-105"
                  />
                </div>

                <div className="flex flex-1 flex-col p-5">
                  {post.published_at ? (
                    <time
                      dateTime={toDateTimeAttribute(post.published_at) ?? undefined}
                      className="text-xs uppercase tracking-wide text-ink-subtle"
                    >
                      {formatDate(post.published_at)}
                    </time>
                  ) : null}

                  {/*
                    Date then title, and no excerpt — F13. At `xl` these cards
                    are 249px wide, where three lines of excerpt under a
                    two-line title is a column of text nobody reads on the way
                    past. The excerpt is still on `/news`, where the card has
                    the width for it.
                  */}
                  <h3 className="mt-2 text-base font-semibold leading-snug text-ink">
                    <Link to={`/news/${post.slug}`} className="after:absolute after:inset-0">
                      {post.title}
                    </Link>
                  </h3>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
