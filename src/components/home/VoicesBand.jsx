import { LatestNews } from "./LatestNews.jsx";
import { Testimonials } from "./Testimonials.jsx";
import { ErrorBoundary } from "../state/ErrorBoundary.jsx";

/**
 * Testimonials beside the news (§10.1).
 *
 * The reference puts these two in **one row** — a third for the quote, two
 * thirds for the three news cards — where the page used to stack them as two
 * full-width bands. This wrapper owns what they no longer do: the container,
 * the rhythm, and the split.
 *
 * **The split happens at `xl`, not `lg`, and that is a departure from the
 * plan.** Three news cards inside two thirds of a 1024px container are 192px
 * each, which is too narrow for a cover, a date and a two-line title; and
 * dropping to two cards there would wrap the third onto a second row beside a
 * single quote, which looks like a mistake. At 1280 the container caps, so the
 * news column is a constant 795px and each card a constant 249px — the width
 * the reference actually draws. Below that the two stack and each keeps the
 * full-width layout it already had.
 *
 * **A boundary per column, still.** Merging the two bands into one would
 * otherwise have merged their error boundaries too, so a bug in a news cover
 * would take the testimonials down with it — which is exactly what RTPP-72
 * added them to prevent. They are `inline`, because the fallback sits inside a
 * column that already has the page's gutters.
 */
export function VoicesBand({ testimonials, posts }) {
  // One number rather than two conditions, so the guard reads the same way as
  // every other band's.
  const anything = (testimonials?.length ?? 0) + (posts?.length ?? 0);
  if (!anything) return null;

  return (
    <div className="mx-auto grid max-w-(--container-max) gap-12 py-(--space-section) pl-(--gutter-l) pr-(--gutter-r) xl:grid-cols-[1fr_2fr] xl:gap-10">
      <ErrorBoundary name="home:testimonials" title="Customer reviews could not be shown" inline>
        <Testimonials testimonials={testimonials} />
      </ErrorBoundary>

      <ErrorBoundary name="home:news" title="Latest updates could not be shown" inline>
        <LatestNews posts={posts} />
      </ErrorBoundary>
    </div>
  );
}
