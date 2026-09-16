import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";

import { ProductCard } from "../components/ProductCard.jsx";
import { BulkSupplyCta } from "../components/products/BulkSupplyCta.jsx";
import { CategoryFilterBar } from "../components/products/CategoryFilterBar.jsx";
import { useCategories } from "../hooks/useCategories.js";
import { publicApi } from "../lib/api.js";
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
          ? "grid gap-5 opacity-60 transition-opacity sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          : "grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
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
    <div role="status" aria-label="Loading products" aria-busy="true" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-16 sm:px-6">
      <header className="py-10">
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
          {activeCategory?.name ?? "Our Products"}
        </h1>
        <p className="mt-2 max-w-xl text-ink-muted">
          {activeCategory?.description ??
            "Discover our range of premium quality teas, crafted with care, passion and trust."}
        </p>
      </header>

      <CategoryFilterBar
        categories={categories.data}
        active={filters.category}
        onSelect={(slug) => update({ category: slug })}
      />

      <div className="py-8">
        {query.isError ? (
          <div role="alert" className="rounded-xl border border-line p-10 text-center">
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
          <div className="rounded-xl border border-line p-10 text-center">
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
  );
}
