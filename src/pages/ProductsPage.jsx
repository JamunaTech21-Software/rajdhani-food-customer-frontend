import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";

import { ProductCard } from "../components/ProductCard.jsx";
import { BulkSupplyCta } from "../components/products/BulkSupplyCta.jsx";
import { CategoryFilterBar } from "../components/products/CategoryFilterBar.jsx";
import { PageHero } from "../components/layout/PageHero.jsx";
import { useCategories } from "../hooks/useCategories.js";
import { useSeo } from "../hooks/useSeo.js";
import { publicApi } from "../lib/api.js";
import { listingPath, PAGE_META, pageSuffix } from "../lib/seo.js";
import {
  isFiltered,
  parseFilters,
  toQueryParams,
  toSearchParams,
  withFilter,
} from "../lib/productFilters.js";

function Grid({ products, isPlaceholder }) {
  return (
    <ul
      className={
        isPlaceholder
          ? "grid gap-5 opacity-60 transition-opacity sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
          : "grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
      }
    >
      {products.map((product, index) => (
        <li key={product.id}>
          {/* The first row is above the fold on most screens. */}
          <ProductCard product={product} priority={index < 4} />
        </li>
      ))}
    </ul>
  );
}

function GridSkeleton() {
  return (
    <div role="status" aria-label="Loading products" aria-busy="true" className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-ground" />
      ))}
    </div>
  );
}

/**
 * The product catalogue (§10.2).
 *
 * **The URL is the state.** Both acceptance criteria — a copied link reproducing
 * the view, and Back stepping through filter changes — come from that one
 * decision, so nothing about the filter lives in component state. `useSearchParams`
 * reads it; changing a filter writes it back and React Router records a history
 * entry, which is what makes Back work at all.
 *
 * Note the contrast with the dashboard's product list, which uses
 * `{ replace: true }` for exactly the same interaction: an admin filtering a
 * table does not want twenty history entries between them and the previous
 * screen. Here, stepping back through filters *is* the expected behaviour.
 */
export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = parseFilters(searchParams);

  const categories = useCategories();

  const query = useQuery({
    queryKey: ["public", "products", filters],
    queryFn: () => publicApi.list("/public/products", { params: toQueryParams(filters) }),
    // Keeps the previous page on screen, dimmed, while the next one loads —
    // rather than collapsing to a skeleton and jumping the scroll position.
    placeholderData: (previous) => previous,
  });

  /*
    The page banner (§10.2).

    `PRODUCTS_HERO` is in the API's placement enum and offered by the admin's
    Banners screen, and this page read neither it nor anything like it — so a
    banner could be uploaded, published and returned by the API while the page
    carried on drawing a hand-written heading. The live row has been sitting
    there unread.

    Not counted towards the catalogue's loading or error state: the products
    are the page, and a banner that fails to arrive should cost it a picture,
    not its listing.
  */
  const hero = useQuery({
    queryKey: ["public", "banners", "PRODUCTS_HERO"],
    queryFn: () => publicApi.list("/public/banners", { params: { placement: "PRODUCTS_HERO" } }),
    staleTime: 5 * 60_000,
  });

  // The bulk-supply block is content, so it comes from its banner placement.
  const dealerCta = useQuery({
    queryKey: ["public", "banners", "DEALER_CTA"],
    queryFn: () => publicApi.list("/public/banners", { params: { placement: "DEALER_CTA" } }),
    staleTime: 5 * 60_000,
  });

  function update(patch) {
    setSearchParams(toSearchParams(withFilter(filters, patch)));
  }

  const products = query.data?.items ?? [];
  const meta = query.data?.meta;
  const filtered = isFiltered(filters);

  const activeCategory = (categories.data ?? []).find((c) => c.slug === filters.category);

  // A category listing gets the category's own name and description, which is
  // the whole reason the admin lets someone write them.
  useSeo({
    title: `${activeCategory?.name ?? PAGE_META.products.title}${pageSuffix(filters.page)}`,
    description: activeCategory?.description || PAGE_META.products.description,
    path: listingPath("/products", filters),
  });

  /*
    One banner, two headings — the arrangement the gallery uses.

    The catalogue index wears the banner as the editor set it. A category
    listing keeps the same picture, because there is one banner and not one per
    category, but takes its name and description from the category row — which
    is the whole reason the admin lets someone write them, and what the
    hand-written header used to do with `activeCategory`.

    Passed as an overridden banner rather than as props, because `PageHero`
    already prefers everything a banner carries over its fallbacks: handing it
    a banner is how you tell it what to draw.
  */
  const banner = hero.data?.items?.[0] ?? null;
  const heroBanner = activeCategory
    ? {
        ...(banner ?? {}),
        title: activeCategory.name,
        title_highlight: null,
        subtitle: activeCategory.description || banner?.subtitle || null,
      }
    : banner;

  return (
    <>
      {/*
        `title` is the floor under an empty placement, not the heading: a page
        with no <h1> has no accessible or indexable name, and the catalogue is
        not going to be nameless because nobody has uploaded a picture.

        A breadcrumb on a category listing only, as the gallery does — the
        index is one click from the header.
      */}
      <PageHero
        banner={heroBanner}
        title={activeCategory?.name ?? "Our Products"}
        breadcrumb={activeCategory ? activeCategory.name : undefined}
      />

    <div className="mx-auto max-w-(--container-max) pb-16 pt-6 pl-(--gutter-l) pr-(--gutter-r)">
      <CategoryFilterBar
        categories={categories.data}
        active={filters.category}
        onSelect={(slug) => update({ category: slug })}
      />

      <div className="py-8">
        {query.isError ? (
          <div role="alert" className="rounded-xl border border-line p-6 text-center sm:p-10">
            <p className="font-display text-xl font-semibold text-ink">
              We could not load the catalogue
            </p>
            <p className="mt-2 text-ink-muted">Something went wrong at our end.</p>
            <button
              type="button"
              onClick={() => query.refetch()}
              className="mt-6 inline-flex h-11 items-center rounded-md bg-brand px-5 text-sm font-medium text-on-brand"
            >
              Try again
            </button>
          </div>
        ) : query.isPending ? (
          <GridSkeleton />
        ) : products.length === 0 ? (
          <div className="rounded-xl border border-line p-6 text-center sm:p-10">
            <p className="font-display text-xl font-semibold text-ink">
              {filtered ? "Nothing here yet" : "No products yet"}
            </p>
            <p className="mt-2 text-ink-muted">
              {filtered
                ? "There are no products in this category at the moment."
                : "Our catalogue is being prepared. Please check back soon."}
            </p>
            {filtered ? (
              <button
                type="button"
                onClick={() => update({ category: null, search: null })}
                className="mt-6 inline-flex h-11 items-center rounded-md bg-brand px-5 text-sm font-medium text-on-brand"
              >
                Show all products
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <p className="sr-only" role="status">
              {meta?.total ?? products.length} products
            </p>

            <Grid products={products} isPlaceholder={query.isPlaceholderData} />

            {meta && meta.totalPages > 1 ? (
              <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={filters.page <= 1}
                  onClick={() => update({ page: filters.page - 1 })}
                  className="h-11 rounded-md border border-line px-5 text-sm font-medium text-ink disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-sm text-ink-muted">
                  Page {meta.page} of {meta.totalPages}
                </span>
                <button
                  type="button"
                  disabled={filters.page >= meta.totalPages}
                  onClick={() => update({ page: filters.page + 1 })}
                  className="h-11 rounded-md border border-line px-5 text-sm font-medium text-ink disabled:opacity-40"
                >
                  Next
                </button>
              </nav>
            ) : null}
          </>
        )}
      </div>

      <BulkSupplyCta banner={dealerCta.data?.items?.[0]} />
    </div>
    </>
  );
}
