import { Link } from "react-router";

import { EmptyState, ErrorState } from "./StatePanel.jsx";
import { ACTION_CLASS } from "../../lib/buttons.js";

/** The shape of a content page, so the wait looks like what follows it. */
function SectionSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading this page"
      aria-busy="true"
      className="mx-auto grid max-w-(--container-max) gap-10 py-(--space-section) pl-(--gutter-l) pr-(--gutter-r) lg:grid-cols-2 lg:items-center lg:gap-14"
    >
      <div>
        <div className="h-3 w-28 animate-pulse rounded bg-ground" />
        <div className="mt-4 h-9 w-3/4 animate-pulse rounded bg-ground" />
        <div className="mt-6 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-3.5 w-full animate-pulse rounded bg-ground" />
          ))}
          <div className="h-3.5 w-2/3 animate-pulse rounded bg-ground" />
        </div>
      </div>

      {/* A reserved box rather than nothing, so the text does not jump sideways
          when the image arrives — the same reason every image on the site is
          given its aspect ratio up front. */}
      <div className="aspect-[4/3] animate-pulse rounded-xl bg-ground" />
    </div>
  );
}

/**
 * The body of a content page, in whichever of its four states it is in (§10.5).
 *
 * The one that earns this component is **empty versus error**. Both end with a
 * page that has nothing on it, and they must not read the same: telling a brand
 * that has simply not written its About page yet that the site is down sends
 * someone hunting a fault that does not exist, and telling a visitor during a
 * real outage that there is nothing here hides it. `combineState` decides
 * which; this draws it.
 *
 * `children` is rendered only when there is something to render, so the pages
 * keep their existing "a section with no block does not appear" behaviour and
 * gain nothing they have to think about.
 */
export function PageSections({ state, error, onRetry, emptyTitle, emptyBody, children }) {
  if (state === "loading") return <SectionSkeleton />;

  if (state === "error" || state === "empty") {
    const contained = "mx-auto max-w-2xl py-(--space-section) pl-(--gutter-l) pr-(--gutter-r)";

    return state === "error" ? (
      <div className={contained}>
        <ErrorState error={error} onRetry={onRetry} />
      </div>
    ) : (
      <div className={contained}>
        <EmptyState
          title={emptyTitle ?? "Nothing here yet"}
          action={
            // Never a dead end. A page an editor has not filled in still has a
            // visitor on it who wanted something.
            <Link to="/contact" className={`mt-6 ${ACTION_CLASS}`}>
              Get in touch
            </Link>
          }
        >
          {emptyBody ?? "This page is being prepared. Please check back soon."}
        </EmptyState>
      </div>
    );
  }

  return children;
}
