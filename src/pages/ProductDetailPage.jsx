import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";

import { ProductCard } from "../components/ProductCard.jsx";
import { BuyPanel } from "../components/product/BuyPanel.jsx";
import { EnquiryModal } from "../components/product/EnquiryModal.jsx";
import { Gallery } from "../components/product/Gallery.jsx";
import { ProductTabs } from "../components/product/ProductTabs.jsx";
import { ReviewsPanel } from "../components/product/ReviewsPanel.jsx";
import { JsonLd } from "../components/seo/Seo.jsx";
import { PageState } from "../components/state/StatePanel.jsx";
import { SITE_URL } from "../config.js";
import { useDownload } from "../hooks/useDownload.js";
import { useSeo } from "../hooks/useSeo.js";
import { publicApi } from "../lib/api.js";
import { ACTION_CLASS, ACTION_QUIET_CLASS } from "../lib/buttons.js";
import { SIZES } from "../lib/cloudinary.js";
import { DOWNLOAD_KEYS } from "../lib/downloadKeys.js";
import { failureKind } from "../lib/loadState.js";
import { breadcrumbFor, defaultPackSize, visibleTabs } from "../lib/productDetail.js";
import { breadcrumbJsonLd, productJsonLd } from "../lib/seo.js";
import { useSiteStore } from "../stores/siteStore.js";

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
  const [enquiryOpen, setEnquiryOpen] = useState(false);

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
  const siteName = useSiteStore((s) => s.site?.name);

  // Above the two early returns, so the loading and not-found states do not sit
  // under the previous product's title. `meta_title` is the admin's override
  // and is null for every product today — the name is what actually ships.
  useSeo({
    title: data?.meta_title || data?.name,
    description: data?.meta_description || data?.short_description,
    image: data?.image?.url,
    // A `meta_title` an editor wrote is used exactly as written — they will
    // have included the brand if they wanted it, and appending it again gives
    // "Premium Green Tea | Rajdhani — Rajdhani Food Products".
    absoluteTitle: Boolean(data?.meta_title),
  });

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
      <div role="status" aria-label="Loading product" aria-busy="true" className="mx-auto max-w-(--container-max) py-10 pl-(--gutter-l) pr-(--gutter-r)">
        <div className="grid gap-10 md:grid-cols-2 md:gap-8 lg:gap-14">
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
    // A 404 and an outage are different sentences. "It may have been withdrawn
    // from the catalogue" told during a five-minute outage is a claim about the
    // product that is simply untrue — and it offers no retry, because for a
    // genuine 404 there is nothing to retry.
    const gone = failureKind(product.error) === "notFound" || (!product.isError && !data);

    return (
      <PageState
        title={gone ? "We could not find that product" : "We could not load that product"}
        action={
          <>
            {gone ? null : (
              <button type="button" onClick={() => product.refetch()} className={ACTION_CLASS}>
                Try again
              </button>
            )}
            <Link to="/products" className={gone ? ACTION_CLASS : ACTION_QUIET_CLASS}>
              Browse all products
            </Link>
          </>
        }
      >
        {gone
          ? "It may have been renamed or withdrawn from the catalogue."
          : "Something went wrong at our end. The rest of the catalogue is still available."}
      </PageState>
    );
  }

  const tabs = visibleTabs(data, { reviewCount: data.rating_count });
  const relatedItems = related.data?.items ?? [];
  const trail = breadcrumbFor(data);

  return (
    <div className="mx-auto max-w-(--container-max) pb-16 pl-(--gutter-l) pr-(--gutter-r)">
      {/* The same trail the page draws, so the two cannot disagree — a crumb
          reading "Classic Black" where the URL segment is a slug is the point
          of emitting names at all. */}
      <JsonLd id="product" data={productJsonLd(data, { siteUrl: SITE_URL, siteName })} />
      <JsonLd id="breadcrumb" data={breadcrumbJsonLd(trail, { siteUrl: SITE_URL })} />

      <Breadcrumbs trail={trail} />

      <div className="grid gap-10 md:grid-cols-2 md:gap-8 lg:gap-14">
        <Gallery images={data.images} alt={data.name} priority />

        <BuyPanel
          product={data}
          pack={pack}
          onSelectPack={setPack}
          quantity={quantity}
          onQuantity={setQuantity}
          brochure={brochure.data}
          onShare={share}
          onEnquire={() => setEnquiryOpen(true)}
        />
      </div>

      {/* Keyed on what it opens with, so each open starts from the current
          pack and quantity rather than whatever was there last time. */}
      <EnquiryModal
        key={enquiryOpen ? `${pack?.id ?? "none"}-${quantity}` : "closed"}
        open={enquiryOpen}
        onOpenChange={setEnquiryOpen}
        product={data}
        pack={pack}
        quantity={quantity}
      />

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
                {/* Four-up straight from `lg`, where the catalogue goes
                    three-up first — a different ramp, so a different `sizes`. */}
                <ProductCard product={item} sizes={SIZES.relatedCard} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
