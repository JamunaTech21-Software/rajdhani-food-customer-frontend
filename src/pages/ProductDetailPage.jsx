import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";

import { ProductCard } from "../components/ProductCard.jsx";
import { BuyPanel } from "../components/product/BuyPanel.jsx";
import { Gallery } from "../components/product/Gallery.jsx";
import { ProductTabs } from "../components/product/ProductTabs.jsx";
import { useDownload } from "../hooks/useDownload.js";
import { publicApi } from "../lib/api.js";
import { DOWNLOAD_KEYS } from "../lib/downloadKeys.js";
import { breadcrumbFor, defaultPackSize, visibleTabs } from "../lib/productDetail.js";

function Breadcrumbs({ trail }) {
  return (
    <nav aria-label="Breadcrumb" className="py-5">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
        {trail.map((crumb, i) => (
          <li key={crumb.label} className="flex items-center gap-1.5">
            {i > 0 ? (
              <ChevronRight size={13} strokeWidth={2} aria-hidden="true" className="text-ink-subtle" />
            ) : null}

            {crumb.to ? (
              <Link to={crumb.to} className="hover:text-brand">
                {crumb.label}
              </Link>
            ) : (
              // The current page is text, not a link to itself, and carries
              // aria-current so a screen reader knows where the trail ends.
              <span aria-current="page" className="text-ink">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function ReviewsPanel({ product }) {
  // The full reviews experience — distribution, list and submission — is
  // RTPP-70. This is the honest placeholder until then, rather than a tab that
  // opens onto nothing.
  if ((product.rating_count ?? 0) > 0) {
    return (
      <p className="text-ink-muted">
        {product.rating_count} {product.rating_count === 1 ? "review" : "reviews"}, averaging{" "}
        {Number(product.rating_average).toFixed(1)} out of 5.
      </p>
    );
  }

  return (
    <p className="text-ink-muted">
      No reviews yet. Be the first to tell others what you think of this tea.
    </p>
  );
}

/**
 * The product detail page (§10.2) — the most complex page on the site.
 *
 * The selected pack size is the page's one piece of local state, and everything
 * priced hangs off it. It is seeded from `defaultPackSize` via a render-time
 * adjustment keyed on the product, so navigating between products resets the
 * selection without an effect and without a frame of the previous product's
 * pack showing.
 */
export function ProductDetailPage() {
  const { slug } = useParams();

  const [pack, setPack] = useState(null);
  const [seededFor, setSeededFor] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const product = useQuery({
    queryKey: ["public", "product", slug],
    queryFn: () => publicApi.get(`/public/products/${encodeURIComponent(slug)}`),
    enabled: Boolean(slug),
  });

  const related = useQuery({
    queryKey: ["public", "product", slug, "related"],
    queryFn: () => publicApi.list(`/public/products/${encodeURIComponent(slug)}/related`),
    enabled: Boolean(slug),
  });

  // Hidden entirely when the key does not resolve — no download rows exist yet,
  // so today this is always hidden rather than dead.
  const brochure = useDownload(DOWNLOAD_KEYS.productBrochure);

  const data = product.data;

  if (data && seededFor !== data.id) {
    setSeededFor(data.id);
    setPack(defaultPackSize(data.pack_sizes));
    setQuantity(1);
  }

  async function share() {
    const url = window.location.href;
    // The native sheet where it exists; the clipboard everywhere else. Both are
    // wrapped because a dismissed share sheet rejects, which is not an error.
    try {
      if (navigator.share) await navigator.share({ title: data?.name, url });
      else await navigator.clipboard?.writeText(url);
    } catch {
      // Cancelled or refused — nothing to report.
    }
  }

  if (product.isPending) {
    return (
      <div role="status" aria-label="Loading product" aria-busy="true" className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="aspect-square animate-pulse rounded-xl bg-ground" />
          <div className="flex flex-col gap-4">
            <div className="h-10 w-2/3 animate-pulse rounded bg-ground" />
            <div className="h-24 w-full animate-pulse rounded bg-ground" />
            <div className="h-12 w-1/2 animate-pulse rounded bg-ground" />
          </div>
        </div>
      </div>
    );
  }

  if (product.isError || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-ink">We could not find that product</h1>
        <p className="mt-2 text-ink-muted">
          It may have been renamed or withdrawn from the catalogue.
        </p>
        <Link
          to="/products"
          className="mt-6 inline-flex h-11 items-center rounded-md bg-brand px-5 text-sm font-medium text-on-brand"
        >
          Browse all products
        </Link>
      </div>
    );
  }

  const tabs = visibleTabs(data, { reviewCount: data.rating_count });
  const relatedItems = related.data?.items ?? [];

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-16 sm:px-6">
      <Breadcrumbs trail={breadcrumbFor(data)} />

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        <Gallery images={data.images} alt={data.name} priority />

        <BuyPanel
          product={data}
          pack={pack}
          onSelectPack={setPack}
          quantity={quantity}
          onQuantity={setQuantity}
          brochure={brochure.data}
          onShare={share}
        />
      </div>

      <div className="mt-14">
        <ProductTabs tabs={tabs} renderPanel={() => <ReviewsPanel product={data} />} />
      </div>

      {relatedItems.length ? (
        <section aria-labelledby="related-heading" className="mt-16">
          <h2 id="related-heading" className="font-display text-2xl font-bold text-ink sm:text-3xl">
            You may also like
          </h2>

          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {relatedItems.map((item) => (
              <li key={item.id}>
                <ProductCard product={item} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
