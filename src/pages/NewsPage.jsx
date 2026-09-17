import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";

import { NewsCard } from "../components/news/NewsCard.jsx";
import { publicApi } from "../lib/api.js";

const PAGE_SIZE = 9;

/**
 * The news listing (§10.4).
 *
 * **No design was supplied for this page** — §19 item 5 asks whether it is
 * required at launch at all. It is built to match the rest of the site rather
 * than invented separately: the same card as the home page's "Latest updates"
 * band, the same page header and empty-state treatment as the catalogue.
 *
 * Not building it was the alternative, and a worse one: the header nav and the
 * home page already link here, so leaving it out means two dead links on every
 * page of the site.
 *
 * The page number lives in the URL for the same reason the catalogue's filters
 * do — a link to page three should open page three.
 */
export function NewsPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(params.get("page"), 10) || 1);

  const query = useQuery({
    queryKey: ["public", "news", { page }],
    queryFn: () => publicApi.list("/public/news", { params: { page, limit: PAGE_SIZE } }),
    placeholderData: (previous) => previous,
  });

  const posts = query.data?.items ?? [];
  const meta = query.data?.meta;

  function goTo(next) {
    const merged = new URLSearchParams(params);
    if (next > 1) merged.set("page", String(next));
    else merged.delete("page");
    setParams(merged);
  }

  return (
    <div className="mx-auto max-w-(--container-max) pb-16 pl-(--gutter-l) pr-(--gutter-r)">
      <header className="py-10">
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">News &amp; Updates</h1>
        <p className="mt-2 max-w-xl text-ink-muted">
          What is happening across our gardens, our factory and our dealer network.
        </p>
      </header>

      {query.isError ? (
        <div role="alert" className="rounded-xl border border-line p-6 text-center sm:p-10">
          <p className="font-display text-xl font-semibold text-ink">We could not load the news</p>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="mt-5 inline-flex h-11 items-center rounded-md bg-brand px-5 text-sm font-medium text-on-brand"
          >
            Try again
          </button>
        </div>
      ) : query.isPending ? (
        <div role="status" aria-label="Loading the news" aria-busy="true" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-line">
              <div className="aspect-[16/9] animate-pulse bg-ground" />
              <div className="p-5">
                <div className="h-4 w-24 animate-pulse rounded bg-ground" />
                <div className="mt-3 h-6 w-full animate-pulse rounded bg-ground" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-line p-6 text-center sm:p-10">
          <p className="font-display text-xl font-semibold text-ink">Nothing published yet</p>
          <p className="mt-2 text-ink-muted">Company news and updates will appear here.</p>
        </div>
      ) : (
        <>
          <p className="sr-only" role="status">
            {meta?.total ?? posts.length} articles
          </p>

          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, index) => (
              <li key={post.slug}>
                {/* The first row is above the fold on most screens. */}
                <NewsCard post={post} priority={index < 3} />
              </li>
            ))}
          </ul>

          {meta && meta.totalPages > 1 ? (
            <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => goTo(page - 1)}
                className="h-11 rounded-md border border-line px-5 text-sm font-medium text-ink disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-ink-muted">
                Page {meta.page} of {meta.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= meta.totalPages}
                onClick={() => goTo(page + 1)}
                className="h-11 rounded-md border border-line px-5 text-sm font-medium text-ink disabled:opacity-40"
              >
                Next
              </button>
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
