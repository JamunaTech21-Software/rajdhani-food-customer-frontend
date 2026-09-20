import { useRouteError } from "react-router";

import { IS_DEV } from "../config.js";
import { ACTION_CLASS, ACTION_QUIET_CLASS } from "../lib/buttons.js";

/**
 * The last thing between a visitor and a white screen (§10.5).
 *
 * This is the router's `errorElement`, so it **replaces the layout** — it is
 * reached when the chrome itself threw, and rendering the header again is how
 * you get a second error inside the error page. Everything here is
 * self-contained and uses nothing but theme tokens, which `tokens.css` carries
 * whether or not `/public/layout` ever answered. So it is branded even during a
 * total API outage, which is exactly when it appears.
 *
 * Deliberately not using `PageState`, `useSeo` or the site store, for the same
 * reason: each is one more thing that can be the thing that is broken.
 *
 * **A hard reload, not a state reset.** By the time this renders, the component
 * that failed is unmounted and React has torn the tree down; re-rendering it
 * would walk straight back into the same error. Reloading is the only recovery
 * that actually clears the cause.
 */
export function RouteErrorPage() {
  const error = useRouteError();

  // In development the message is worth showing — the alternative is switching
  // to the console to find out what a blank page means. In production it is a
  // minified string that tells a visitor nothing and may leak internals.
  const detail = IS_DEV ? (error?.message ?? String(error)) : null;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface px-6 py-16 text-center">
      <p className="text-eyebrow font-semibold uppercase tracking-[0.2em] text-brand">
        Rajdhani Food Products
      </p>

      <h1 className="mt-4 font-display text-2xl font-bold text-ink sm:text-3xl">
        Something went wrong
      </h1>

      <p className="mt-3 max-w-md leading-relaxed text-ink-muted">
        This page ran into a problem we did not expect. Reloading usually clears it.
      </p>

      {detail ? (
        <pre className="mt-6 max-w-lg overflow-x-auto rounded-md bg-ground p-4 text-left text-xs text-ink-muted">
          {detail}
        </pre>
      ) : null}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => window.location.reload()} className={ACTION_CLASS}>
          Reload the page
        </button>

        {/* A plain anchor, not a Link: the router is what failed, and asking it
            to navigate is asking the broken thing to fix itself. */}
        <a href="/" className={ACTION_QUIET_CLASS}>
          Go to the home page
        </a>
      </div>
    </div>
  );
}
