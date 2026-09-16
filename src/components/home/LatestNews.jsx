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
    <section aria-labelledby="news-heading" className="py-16">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-eyebrow font-semibold uppercase tracking-[0.2em] text-brand">
              Latest News &amp; Updates
            </p>
            <h2 id="news-heading" className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">
              From the garden and the factory
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

        <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.slug}>
              <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface">
                <div className="aspect-[16/9] overflow-hidden bg-ground">
                  <CloudinaryImage
                    src={post.cover_image?.url}
                    alt={post.cover_image?.alt ?? ""}
                    sizes={SIZES.card}
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

                  <h3 className="mt-2 font-display text-lg font-semibold leading-snug text-ink">
                    <Link to={`/news/${post.slug}`} className="after:absolute after:inset-0">
                      {post.title}
                    </Link>
                  </h3>

                  {post.excerpt ? (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-muted">
                      {post.excerpt}
                    </p>
                  ) : null}
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
