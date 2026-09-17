import { useQuery } from "@tanstack/react-query";

import { FeaturedProducts } from "../components/home/FeaturedProducts.jsx";
import { Hero } from "../components/home/Hero.jsx";
import { LatestNews } from "../components/home/LatestNews.jsx";
import { StatsBand } from "../components/home/StatsBand.jsx";
import { UspStrip } from "../components/home/UspStrip.jsx";
import { WelcomeBlock } from "../components/home/WelcomeBlock.jsx";
import { Testimonials } from "../components/home/Testimonials.jsx";
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

  if (home.isPending) return <Skeleton />;

  if (home.isError) {
    return (
      <div className="mx-auto max-w-lg py-24 text-center pl-(--gutter-l) pr-(--gutter-r)">
        <h1 className="font-display text-2xl font-bold text-ink">We could not load this page</h1>
        <p className="mt-2 text-ink-muted">
          Something went wrong at our end. The rest of the site is still available.
        </p>
        <button
          type="button"
          onClick={() => home.refetch()}
          className="mt-6 inline-flex h-11 items-center rounded-md bg-brand px-5 text-sm font-medium text-on-brand"
        >
          Try again
        </button>
      </div>
    );
  }

  const data = home.data ?? {};

  return (
    <>
      <Hero banners={data.banners} />
      <UspStrip items={data.usp_items} />
      <FeaturedProducts products={data.featured_products} />
      <WelcomeBlock block={data.welcome} promo={data.promo_banner} />
      <StatsBand stats={data.stats} />
      <Testimonials testimonials={data.testimonials} />
      <LatestNews posts={data.news} />
    </>
  );
}
