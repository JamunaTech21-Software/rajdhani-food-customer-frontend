import { useQuery } from "@tanstack/react-query";

import { AboutBand } from "../components/home/AboutBand.jsx";
import { DealerCta } from "../components/home/DealerCta.jsx";
import { FeaturedProducts } from "../components/home/FeaturedProducts.jsx";
import { Hero } from "../components/home/Hero.jsx";
import { ProcessBand } from "../components/home/ProcessBand.jsx";
import { UspStrip } from "../components/home/UspStrip.jsx";
import { VoicesBand } from "../components/home/VoicesBand.jsx";
import { ErrorBoundary } from "../components/state/ErrorBoundary.jsx";
import { ErrorState } from "../components/state/StatePanel.jsx";
import { itemsOf, useProcessSteps } from "../hooks/usePageContent.js";
import { useProductCatalogue } from "../hooks/useProductCatalogue.js";
import { useSeo } from "../hooks/useSeo.js";
import { publicApi } from "../lib/api.js";

function Skeleton() {
  return (
    <div role="status" aria-label="Loading the home page" aria-busy="true">
      <div className="min-h-(--hero-min) animate-pulse bg-ground" />
      <div className="mx-auto max-w-(--container-max) py-(--space-section) pl-(--gutter-l) pr-(--gutter-r)">
        <div className="h-8 w-64 animate-pulse rounded bg-ground" />
        {/* The strip's shape exactly, including the six-up track at `xl` and
            the space the arrows take out of the row. A skeleton that drew a
            different shape would make the page jump when the data arrived,
            which is the one thing a skeleton exists to prevent. */}
        <div className="mt-8 flex items-center gap-3">
          <div aria-hidden="true" className="hidden size-11 shrink-0 xl:block" />
          <div className="grid min-w-0 flex-1 auto-cols-[calc((100%-1.5rem)/4)] grid-flow-col gap-2 overflow-hidden pb-4 sm:auto-cols-[minmax(15rem,1fr)] sm:gap-5 xl:auto-cols-[calc((100%-100px)/6)] xl:pb-0">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-ground" />
            ))}
          </div>
          <div aria-hidden="true" className="hidden size-11 shrink-0 xl:block" />
        </div>
      </div>
    </div>
  );
}

/**
 * The bands of the home page, in the order the reference draws them.
 *
 * A list rather than eight elements written out, so each one can be wrapped in
 * its own boundary without eight copies of the wrapper. `label` is what the
 * fallback panel says when a section fails — "Featured teas could not be
 * shown" tells a visitor which part of the page is missing, where a generic
 * "something went wrong" leaves them wondering what they are not seeing.
 */
const SECTIONS = [
  {
    name: "hero",
    label: "The banner could not be shown",
    render: (data) => (
      <Hero
        banners={data.banners}
        onDownload={data.downloadCatalogue}
        downloading={data.catalogueState === "working"}
      />
    ),
  },
  { name: "usp", label: "This section could not be shown", render: (data) => <UspStrip items={data.usp_items} /> },
  {
    name: "featured",
    label: "Featured teas could not be shown",
    render: (data) => <FeaturedProducts products={data.featured_products} />,
  },
  {
    name: "about",
    label: "This section could not be shown",
    render: (data) => <AboutBand block={data.welcome} stats={data.stats} />,
  },
  {
    name: "process",
    label: "Our process could not be shown",
    render: (data) => <ProcessBand steps={data.process_steps} />,
  },
  {
    name: "dealer",
    label: "This section could not be shown",
    render: (data) => <DealerCta banner={data.dealer_cta} />,
  },
  {
    name: "voices",
    label: "This section could not be shown",
    render: (data) => <VoicesBand testimonials={data.testimonials} posts={data.news} />,
  },
];

/**
 * The home page (§10.1).
 *
 * Band order follows the reference: hero, USP strip, products, the About band
 * (the welcome text with the counters beside it), the process band, the dealer
 * bar, then the testimonials beside the news. Seven, where the reference draws
 * seven.
 *
 * **RTPP-59's "everything from one request" is no longer literally true.** Two
 * bands the reference added are not in the home payload: the process steps,
 * whose public
 * endpoint did not exist when `/public/home` was designed, and the dealer
 * banner, which `/products` already fetches under the same query key so the
 * two share one cache entry.
 *
 * What the criterion was protecting is intact — both are small, cached, and
 * nothing waits on them, so the page still paints on the home payload alone.
 * But it is a drift, not a free lunch: folding `FROM_GARDEN_TO_CUP` and
 * `DEALER_CTA` into `/public/home` would restore it exactly and delete two
 * lines here. Asked of the backend; see `homepage-plan.md` §4.
 */
export function HomePage() {
  const home = useQuery({
    queryKey: ["public", "home"],
    queryFn: () => publicApi.get("/public/home"),
  });

  // The group name is the API's own, from the enum its validator rejects
  // anything else against — `FROM_GARDEN_TO_CUP` is literally the band's
  // heading. Five steps are published against it.
  const process = useProcessSteps("FROM_GARDEN_TO_CUP");

  // The same key `/products` uses for the same banner, so the two share one
  // cache entry: a visitor who arrives here and then opens the catalogue does
  // not fetch it twice. Five minutes, because a scheduled banner does not
  // change inside a session.
  const dealer = useQuery({
    queryKey: ["public", "banners", "DEALER_CTA"],
    queryFn: () => publicApi.list("/public/banners", { params: { placement: "DEALER_CTA" } }),
    staleTime: 5 * 60_000,
  });

  // The hero's second button. On demand rather than a query: it fetches every
  // published product, and doing that on load to serve a button most visitors
  // never press would make it the largest request on the page, for nothing.
  const catalogue = useProductCatalogue();

  // No title of its own: the home page is where `site_profile`'s own
  // `meta_title` belongs, unsuffixed. "Rajdhani Food Products — Rajdhani Food
  // Products" is what passing one here would produce.
  useSeo({ path: "/" });

  if (home.isPending) return <Skeleton />;

  if (home.isError) {
    return (
      <div className="mx-auto max-w-2xl py-16 pl-(--gutter-l) pr-(--gutter-r) sm:py-24">
        <ErrorState
          error={home.error}
          title="We could not load this page"
          onRetry={() => home.refetch()}
        />
      </div>
    );
  }

  // Neither of these is a field of `/public/home`. They are merged in here so
  // every band reads one object and none has to know which request its data
  // arrived on — and so folding either into the payload later is a deletion
  // rather than a refactor.
  const data = {
    ...(home.data ?? {}),
    process_steps: itemsOf(process),
    dealer_cta: dealer.data?.items?.[0] ?? null,
    downloadCatalogue: catalogue.download,
    catalogueState: catalogue.state,
  };

  // A boundary per section, which is what keeps a bug in one of them local.
  // Every section here is fed from the same payload, so one field that is not
  // the shape the schema promised would otherwise take the whole home page
  // down — and the home page is the one that has to work.
  return (
    <>
      {SECTIONS.map(({ name, label, render }) => (
        <ErrorBoundary key={name} name={`home:${name}`} title={label}>
          {render(data)}
        </ErrorBoundary>
      ))}
    </>
  );
}
