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
        <div className="flex flex-wrap items-end justify-between gap-x-2 gap-y-1 sm:gap-4">
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
              className="text-eyebrow font-semibold uppercase tracking-[0.08em] text-brand sm:tracking-[0.2em]"
            >
              Latest News &amp; Updates
            </h2>
          </div>

          {/*
            A green text link on a phone, the bordered button from `sm`.

            The reference draws it as a link, and the column has no room for
            anything else: the heading and a 137px outlined button do not fit
            across 192px. The height stays `h-11` so the target keeps its 44px
            (WCAG 2.5.5) even without a visible box, and the last word is only
            dropped visually — the accessible name still says which list it
            opens, which 2.5.3 wants.
          */}
          <Link
            to="/news"
            className="inline-flex h-11 shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-brand transition-colors duration-(--duration-fast) hover:text-brand-dark sm:gap-2 sm:rounded-md sm:border sm:border-line sm:px-5 sm:text-sm sm:text-ink sm:hover:border-brand sm:hover:text-brand"
          >
            {/*
              One flex item, not two. The link is `inline-flex`, so a bare
              sibling span becomes its own flex item and `gap-2` lands where
              a word space belongs — 8px instead of 4px between "All" and
              "News" on desktop. Wrapped, the inner span is ordinary inline
              content and the space between the words is a space.
            */}
            <span>
              View All<span className="sr-only sm:not-sr-only"> News</span>
            </span>
            <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>

        {/*
          Two on a phone, three from `sm`.

          The mobile reference shows two, and the third is hidden rather than
          sliced off the array so the desktop grid keeps all three from one
          render. `display: none` also takes it out of the accessibility tree,
          which is right here: it is a duplicate of what "View All News" leads
          to, not content that only exists on this page.
        */}
        <ul className="mt-3 grid gap-3 [&>li:nth-child(n+3)]:hidden sm:mt-6 sm:gap-6 sm:[&>li:nth-child(n+3)]:block md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.slug}>
              {/*
                A row on a phone, the card it has always been from `sm`. The
                reference sets the cover as a small square at the start of the
                line with the date and title beside it — at 192px of column
                there is no width for a 16:9 cover with text underneath.
              */}
              <article className="group relative flex h-full flex-row items-stretch overflow-hidden rounded-xl border border-line bg-surface sm:flex-col">
                {/* 3.5rem square in the row, the full-width 16:9 cover from
                    `sm`. `shrink-0` so a long headline cannot squeeze it, and
                    small enough to leave the headline ~118px of the 192px
                    column — at 4.5rem the titles ellipsed after four words. */}
                <div className="aspect-square w-14 shrink-0 overflow-hidden bg-ground sm:aspect-[16/9] sm:w-auto">
                  <CloudinaryImage
                    src={post.cover_image?.url}
                    alt={post.cover_image?.alt ?? ""}
                    sizes={SIZES.homeNewsCard}
                    className="size-full transition-transform duration-(--duration-slow) group-hover:scale-105"
                  />
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center p-2 sm:justify-start sm:p-5">
                  {post.published_at ? (
                    <time
                      dateTime={toDateTimeAttribute(post.published_at) ?? undefined}
                      className="text-[0.625rem] uppercase tracking-wide text-ink-subtle sm:text-xs"
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
                  {/* Three lines on a phone at 11px, which is what fits
                      "Upgrading Our Production Facility" whole beside a
                      3.5rem cover. The clamp is the backstop for a longer
                      one, not the normal case. */}
                  <h3 className="mt-0.5 line-clamp-3 text-[0.6875rem] font-semibold leading-tight text-ink sm:mt-2 sm:line-clamp-none sm:text-base sm:leading-snug">
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
