import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { GalleryGrid } from "../components/gallery/GalleryGrid.jsx";
import { Lightbox } from "../components/gallery/Lightbox.jsx";
import { Icon } from "../components/ui/Icon.jsx";
import { cn } from "../lib/cn.js";
import { galleryTabs } from "../lib/gallery.js";
import { publicApi } from "../lib/api.js";
import { useScrollEdges } from "../hooks/useScrollEdges.js";

const PAGE_SIZE = 24;

function Tabs({ tabs, active, onSelect }) {
  const [stripRef, stripProps] = useScrollEdges();
  return (
    <div className="sticky top-16 z-30 -ml-(--gutter-l) -mr-(--gutter-r) border-b border-line bg-surface/95 pl-(--gutter-l) pr-(--gutter-r) backdrop-blur-sm">
      <ul
        ref={stripRef}
        {...stripProps}
        aria-label="Filter by category"
        className="scroll-fade flex gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => {
          const selected = active === tab.slug;

          return (
            <li key={tab.slug ?? "all"}>
              <button
                type="button"
                onClick={() => onSelect(tab.slug)}
                aria-pressed={selected}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-md px-4 py-2.5 text-sm font-medium transition-colors duration-(--duration-fast)",
                  selected ? "bg-brand text-on-brand" : "text-ink hover:bg-ground",
                )}
              >
                <Icon name={tab.icon_name} size={16} />
                {tab.name}
                {/* The count keeps an empty category honest rather than looking
                    broken when it opens onto nothing. */}
                {typeof tab.count === "number" ? (
                  <span className={cn("text-xs", selected ? "text-on-brand/70" : "text-ink-subtle")}>
                    {tab.count}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * The gallery (§10.4).
 *
 * One component serves both `/gallery` and `/gallery/:slug`. The tab bar filters
 * by navigating, so a category is a real URL with its own hero and breadcrumb —
 * which is what the scope asks for, and it also settles §19's open item
 * pragmatically: whichever way the client answers "do Events and Team need their
 * own pages", both the tabs and the deep links work.
 */
export function GalleryPage() {
  const { slug = null } = useParams();
  const navigate = useNavigate();
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const categories = useQuery({
    queryKey: ["public", "gallery", "categories"],
    queryFn: () => publicApi.list("/public/gallery/categories"),
    staleTime: 5 * 60_000,
  });

  const images = useQuery({
    queryKey: ["public", "gallery", { slug }],
    queryFn: () =>
      publicApi.list("/public/gallery", {
        params: { category: slug ?? undefined, limit: PAGE_SIZE },
      }),
    placeholderData: (previous) => previous,
  });

  const tabs = galleryTabs(categories.data?.items);
  const items = images.data?.items ?? [];
  const category = (categories.data?.items ?? []).find((c) => c.slug === slug) ?? null;

  return (
    <div className="mx-auto max-w-(--container-max) pb-16 pl-(--gutter-l) pr-(--gutter-r)">
      <header className="py-10">
        {/* A category page gets its own breadcrumb; the index does not need one. */}
        {category ? (
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
              <li>
                <Link to="/" className="hover:text-brand">
                  Home
                </Link>
              </li>
              <li className="flex items-center gap-1.5">
                <ChevronRight size={13} strokeWidth={2} aria-hidden="true" className="text-ink-subtle" />
                <Link to="/gallery" className="hover:text-brand">
                  Gallery
                </Link>
              </li>
              <li className="flex items-center gap-1.5">
                <ChevronRight size={13} strokeWidth={2} aria-hidden="true" className="text-ink-subtle" />
                <span aria-current="page" className="text-ink">
                  {category.name}
                </span>
              </li>
            </ol>
          </nav>
        ) : null}

        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
          {category?.name ?? "Gallery"}
        </h1>
        <p className="mt-2 max-w-xl text-ink-muted">
          {category?.description ??
            "Inside our gardens, our factory and the people behind every cup."}
        </p>
      </header>

      <Tabs
        tabs={tabs}
        active={slug}
        onSelect={(next) => {
          setLightboxIndex(null);
          navigate(next ? `/gallery/${next}` : "/gallery");
        }}
      />

      <div className="py-8">
        {images.isError ? (
          <div role="alert" className="rounded-xl border border-line p-6 text-center sm:p-10">
            <p className="font-display text-xl font-semibold text-ink">
              We could not load the gallery
            </p>
            <button
              type="button"
              onClick={() => images.refetch()}
              className="mt-5 inline-flex h-11 items-center rounded-md bg-brand px-5 text-sm font-medium text-on-brand"
            >
              Try again
            </button>
          </div>
        ) : images.isPending ? (
          <div role="status" aria-label="Loading the gallery" aria-busy="true" className="columns-1 gap-4 min-[360px]:columns-2 md:columns-3 xl:columns-4 [&>div]:mb-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="break-inside-avoid">
                <div className="animate-pulse rounded-lg bg-ground" style={{ aspectRatio: i % 2 ? "3 / 4" : "1 / 1" }} />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-line p-6 text-center sm:p-10">
            <p className="font-display text-xl font-semibold text-ink">Nothing here yet</p>
            <p className="mt-2 text-ink-muted">
              {category
                ? `There are no photographs in ${category.name} at the moment.`
                : "Photographs will appear here soon."}
            </p>
            {category ? (
              <Link
                to="/gallery"
                className="mt-6 inline-flex h-11 items-center rounded-md bg-brand px-5 text-sm font-medium text-on-brand"
              >
                See the whole gallery
              </Link>
            ) : null}
          </div>
        ) : (
          <>
            <p className="sr-only" role="status">
              {images.data?.meta?.total ?? items.length} photographs
            </p>
            <GalleryGrid images={items} onOpen={setLightboxIndex} />
          </>
        )}
      </div>

      <Lightbox
        images={items}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />
    </div>
  );
}
