import { useQuery } from "@tanstack/react-query";

import { FeaturedProducts } from "../components/home/FeaturedProducts.jsx";
import { Hero } from "../components/home/Hero.jsx";
import { LatestNews } from "../components/home/LatestNews.jsx";
import { StatsBand } from "../components/home/StatsBand.jsx";
import { UspStrip } from "../components/home/UspStrip.jsx";
import { WelcomeBlock } from "../components/home/WelcomeBlock.jsx";
import { Testimonials } from "../components/home/Testimonials.jsx";
import { ErrorBoundary } from "../components/state/ErrorBoundary.jsx";
import { ErrorState } from "../components/state/StatePanel.jsx";
import { useSeo } from "../hooks/useSeo.js";
import { publicApi } from "../lib/api.js";

function Skeleton() {
  return (
    <div role="status" aria-label="Loading the home page" aria-busy="true">
      <div className="min-h-(--hero-min) animate-pulse bg-ground" />
      <div className="mx-auto max-w-(--container-max) py-(--space-section) pl-(--gutter-l) pr-(--gutter-r)">
        <div className="h-8 w-64 animate-pulse rounded bg-ground" />
        <div className="mt-8 grid auto-cols-[minmax(15rem,1fr)] grid-flow-col gap-5 overflow-hidden pb-4 lg:grid-flow-row lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-ground" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * The bands of the home page, in the order the approved comp draws them.
 *
 * A list rather than seven elements written out, so each one can be wrapped in
 * its own boundary without seven copies of the wrapper. `label` is what the
 * fallback panel says when a section fails — "Featured teas could not be
 * shown" tells a visitor which part of the page is missing, where a generic
 * "something went wrong" leaves them wondering what they are not seeing.
 */
const SECTIONS = [
  { name: "hero", label: "The banner could not be shown", render: (data) => <Hero banners={data.banners} /> },
  { name: "usp", label: "This section could not be shown", render: (data) => <UspStrip items={data.usp_items} /> },
  {
    name: "featured",
    label: "Featured teas could not be shown",
    render: (data) => <FeaturedProducts products={data.featured_products} />,
  },
  {
    name: "welcome",
    label: "This section could not be shown",
    render: (data) => <WelcomeBlock block={data.welcome} promo={data.promo_banner} />,
  },
  { name: "stats", label: "This section could not be shown", render: (data) => <StatsBand stats={data.stats} /> },
  {
    name: "testimonials",
    label: "Customer reviews could not be shown",
    render: (data) => <Testimonials testimonials={data.testimonials} />,
  },
  { name: "news", label: "Latest updates could not be shown", render: (data) => <LatestNews posts={data.news} /> },
];

/**
 * The home page (§10.1).
 *
 * **Everything on it comes from one `GET /public/home`** — RTPP-59's first
 * acceptance criterion. The chrome around it was already fetched at boot, so a
 * cold home page is two requests in total and neither waits on the other.
 *
 * Section order follows the approved comp: hero, USP strip, products, the
 * welcome teaser, stats, testimonials, news.
 *
 * One band of the signed-off design is still absent: "From Garden To Your Cup"
 * needs `ProcessStep`, which has admin routes but no public endpoint. Every
 * other section renders as soon as its content is published.
 */
export function HomePage() {
  const home = useQuery({
    queryKey: ["public", "home"],
    queryFn: () => publicApi.get("/public/home"),
  });

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

  const data = home.data ?? {};

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
