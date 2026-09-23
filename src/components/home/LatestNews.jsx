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
    <section aria-labelledby='news-heading'>
      <div>
        <div className='flex flex-nowrap items-center justify-between gap-1 sm:items-end sm:gap-4'>
          <div className='min-w-0'>
            <h2
              id='news-heading'
              className='whitespace-nowrap text-[0.58rem] font-semibold uppercase tracking-[0.05em] text-brand sm:text-eyebrow sm:tracking-[0.2em]'
            >
              Latest News &amp; Updates
            </h2>
          </div>

          <Link
            to='/news'
            className='inline-flex h-9 shrink-0 items-center gap-1 whitespace-nowrap text-[0.6rem] font-medium text-brand transition-colors duration-(--duration-fast) hover:text-brand-dark sm:h-11 sm:gap-2 sm:rounded-md sm:border sm:border-line sm:px-5 sm:text-sm sm:text-ink sm:hover:border-brand sm:hover:text-brand'
          >
            <span>
              View All
              <span className='sr-only sm:not-sr-only'> News</span>
            </span>

            <ArrowRight size={13} strokeWidth={2} aria-hidden='true' />
          </Link>
        </div>

        <ul className='mt-3 grid gap-2.5 [&>li:nth-child(n+3)]:hidden sm:mt-6 sm:gap-6 sm:[&>li:nth-child(n+3)]:block md:grid-cols-2 lg:grid-cols-3'>
          {posts.map((post) => (
            <li key={post.slug}>
              <article className='group relative flex h-full flex-row items-stretch overflow-hidden rounded-md border border-line bg-surface sm:flex-col sm:rounded-xl'>
                <div className='aspect-[16/9] w-[7.25rem] shrink-0 overflow-hidden bg-ground sm:aspect-[16/9] sm:w-auto'>
                  <CloudinaryImage
                    src={post.cover_image?.url}
                    alt={post.cover_image?.alt ?? ""}
                    sizes={SIZES.homeNewsCard}
                    className='size-full object-cover transition-transform duration-(--duration-slow) group-hover:scale-105'
                  />
                </div>

                <div className='flex min-w-0 flex-1 flex-col justify-center px-2.5 py-2 sm:justify-start sm:p-5'>
                  {post.published_at ? (
                    <time
                      dateTime={
                        toDateTimeAttribute(post.published_at) ?? undefined
                      }
                      className='text-[0.5rem] uppercase tracking-wide text-ink-subtle sm:text-xs'
                    >
                      {formatDate(post.published_at)}
                    </time>
                  ) : null}

                  <h3 className='mt-0.5 line-clamp-3 text-[0.72rem] font-semibold leading-[1.15] text-ink sm:mt-2 sm:line-clamp-none sm:text-base sm:leading-snug'>
                    <Link
                      to={`/news/${post.slug}`}
                      className='after:absolute after:inset-0'
                    >
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
