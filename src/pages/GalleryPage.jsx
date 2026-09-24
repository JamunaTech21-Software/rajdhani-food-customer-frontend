import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { GalleryGrid } from "../components/gallery/GalleryGrid.jsx";
import { Lightbox } from "../components/gallery/Lightbox.jsx";
import { Icon } from "../components/ui/Icon.jsx";
import { GalleryHighlight } from "../components/gallery/GalleryHighlight.jsx";
import { PageHero } from "../components/layout/PageHero.jsx";
import { blocksOf, itemsOf, usePageBlocks, useStats } from "../hooks/usePageContent.js";
import { useSeo } from "../hooks/useSeo.js";
import { cn } from "../lib/cn.js";
import { galleryTabs } from "../lib/gallery.js";
import { publicApi } from "../lib/api.js";
import { blockFor, PAGE_KEYS } from "../lib/pageContent.js";
import { PAGE_META } from "../lib/seo.js";
// TEMPORARY — delete with `lib/contentFixtures.js` once the admin content is in.
import {
  blockOrFixture,
  GALLERY_HIGHLIGHT_BLOCK,
  GALLERY_STATS,
  orFixture,
} from "../lib/contentFixtures.js";
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

  /*
    The page banner (§10.4).

    `GALLERY_HERO` has been in the API's placement enum and offered by the
    admin's Banners screen all along — this page just never read it, so an
    editor could upload a gallery banner and watch nothing happen. This is the
    other half of that control.

    Not counted towards the page's loading or error state, for the same reason
    About and Quality do not count theirs: the gallery is the images, and a
    banner that fails to arrive should cost the page its picture, not its
    content.
  */
  const hero = useQuery({
    queryKey: ["public", "banners", "GALLERY_HERO"],
    queryFn: () => publicApi.list("/public/banners", { params: { placement: "GALLERY_HERO" } }),
    staleTime: 5 * 60_000,
  });

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

  useSeo({
    // "Factory Gallery", not "Factory" — the category name alone in a search
    // result gives no clue what the page actually holds.
    title: category ? `${category.name} Gallery` : PAGE_META.gallery.title,
    description: category?.description || PAGE_META.gallery.description,
  });

  /*
    The closing strip's two halves — the words and the figures (§10.4).

    Both resources were readable and neither was read: `page-blocks/gallery`
    answers 200 with an empty list, so the page key is accepted, and the
    admin's Sections screen has offered the `GALLERY` stat group all along.
    An editor could fill in all four counters and see nothing.

    Kept out of the page's loading and error state, like the banner: the
    gallery is its images, and a strip at the bottom that fails to arrive is
    not a reason to replace the pictures with an error.
  */
  const closing = usePageBlocks(PAGE_KEYS.gallery);
  const galleryStats = useStats("GALLERY");

  const closingBlock = blockOrFixture(
    blockFor(blocksOf(closing), "closing"),
    GALLERY_HIGHLIGHT_BLOCK,
  );
  const closingStats = orFixture(itemsOf(galleryStats), GALLERY_STATS);

  /*
    One banner, two headings.

    The index wears the banner exactly as the editor set it. A category page
    keeps the same picture — there is one banner, not one per category — but
    takes its name and description from the category row, which is the thing
    an editor maintains per category in Content → Gallery. Written as an
    override of the banner rather than as props on `PageHero` because that
    component already prefers everything a banner carries over its fallbacks;
    handing it a banner is how you tell it what to draw.
  */
  const banner = hero.data?.items?.[0] ?? null;
  const heroBanner = category
    ? {
        ...(banner ?? {}),
        title: category.name,
        title_highlight: null,
        subtitle: category.description || banner?.subtitle || null,
      }
    : banner;

  return (
    <>
      {/*
        The banner the comp draws, and the one the admin has been able to set
        all along. `title` is only the floor under an empty placement: a page
        with no <h1> has no accessible or indexable name, and the gallery is
        not going to be nameless because nobody has uploaded a picture yet.

        The breadcrumb is a category page's, as it was before — the comp draws
        none on the index, and the index is one click from the header anyway.
      */}
      <PageHero
        banner={heroBanner}
        title={category?.name ?? "Gallery"}
        breadcrumb={category ? category.name : undefined}
        ornament
      />

    <div className="mx-auto max-w-(--container-max) pb-16 pt-6 pl-(--gutter-l) pr-(--gutter-r)">
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

      <GalleryHighlight block={closingBlock} stats={closingStats} />

      <Lightbox
        images={items}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />
    </div>
    </>
  );
}
