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
    /*
      `pb-2`, not a full section, and it is the comp's own figure: the news
      cards' lower border sits 9px above the footer's top edge at
      1280-equivalent — 7px of a 1024-wide frame. Ours was 48px.

      The same reasoning as the process band's join with the dealer bar. This
      is not a gap between two bands that each need air; it is the last
      content on the page resting on a solid dark block, and the comp draws
      the two almost touching. The footer supplies all the breathing room
      needed on its own side.
    */
    /*
      Two columns on a phone, one from `sm`, the reference split from `xl`.

      The mobile reference puts these side by side rather than stacked, and
      measuring it gives roughly 162px for the quote against 192px for the
      news at a 390 viewport. Stacked, these two bands were 1332px of a 3959px
      page — a third of the scroll for the least of the content.

      48/52 rather than the 46/54 the mock measures, and the extra 7px is
      doing a job: "What Our Clients Say" needs 158px on one line and 46%
      leaves 157. A heading that wraps for the sake of a pixel, next to one
      that does not, reads as a mistake. The mock is a low-resolution render,
      so its split is an estimate to begin with.

      It reverts to one column at `sm` on purpose. The middle widths have
      always stacked, the desktop split at `xl` is unchanged, and the only
      thing being fixed here is the phone.

      `[&>*]:min-w-0` because a grid column is `min-width: auto` by default
      and will not shrink below its content. Without it the news column's
      cards set the floor and the row pushes past the viewport — the classic
      way a two-column phone layout starts scrolling sideways.
    */
    <div className="mx-auto grid max-w-(--container-max) grid-cols-[48fr_52fr] gap-4 pb-2 pt-(--space-section) pl-(--gutter-l) pr-(--gutter-r) [&>*]:min-w-0 sm:grid-cols-1 sm:gap-12 xl:grid-cols-[1fr_2fr] xl:gap-10">
      <ErrorBoundary name="home:testimonials" title="Customer reviews could not be shown" inline>
        <Testimonials testimonials={testimonials} />
      </ErrorBoundary>

      <ErrorBoundary name="home:news" title="Latest updates could not be shown" inline>
        <LatestNews posts={posts} />
      </ErrorBoundary>
    </div>
  );
}
