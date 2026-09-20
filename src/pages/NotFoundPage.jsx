import { Link, useLocation } from "react-router";

import { PageState } from "../components/state/StatePanel.jsx";
import { useSeo } from "../hooks/useSeo.js";
import { ACTION_CLASS, ACTION_QUIET_CLASS } from "../lib/buttons.js";

/**
 * A URL this site does not have (§10.5).
 *
 * Until now there was **no catch-all route at all**: an unmatched path rendered
 * the layout with an empty `<main>`, so a mistyped link gave a header, a footer
 * and nothing in between — indistinguishable from a page that failed to load,
 * and with nothing to click.
 *
 * Inside the layout rather than replacing it, which is the whole point: the
 * header and footer are the way out, and a 404 that strips them leaves the
 * browser's Back button as the only navigation. The two links below are for
 * the visitor who arrived from outside and has no Back to press.
 *
 * `noindex` because this is not a page anyone should find in a search result,
 * and the canonical would otherwise claim the mistyped URL is real.
 */
export function NotFoundPage() {
  const { pathname } = useLocation();

  useSeo({ title: "Page not found", description: "We could not find that page.", noindex: true });

  return (
    <PageState
      title="We could not find that page"
      action={
        <>
          <Link to="/" className={ACTION_CLASS}>
            Go to the home page
          </Link>
          <Link to="/products" className={ACTION_QUIET_CLASS}>
            Browse our teas
          </Link>
        </>
      }
    >
      <p>
        Nothing lives at{" "}
        {/* The path, so someone reporting it has something to quote — and so a
            typo is visible as a typo. `break-all` because a long path would
            otherwise push the panel wider than the screen. */}
        <span className="break-all font-medium text-ink">{pathname}</span>. It may have been moved,
        or the link that brought you here may be out of date.
      </p>
    </PageState>
  );
}
