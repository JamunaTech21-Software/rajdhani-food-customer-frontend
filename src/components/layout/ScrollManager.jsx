import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router";

/**
 * Where a route change leaves the window.
 *
 * A `<Link>` swaps the component tree without a document load, so the browser
 * keeps whatever scroll offset it had. Scroll to the footer, click through to
 * another page, and the new page arrives already scrolled to the bottom —
 * which is the bug this fixes. React Router does not do it on its own: scroll
 * handling is opt-in, because plenty of routes want to keep their position.
 *
 * **Why not `<ScrollRestoration />`.** It is the framework's answer and it has
 * the right semantics, but it restores with `window.scrollTo(0, 0)` — the
 * two-argument form, which obeys CSS `scroll-behavior`. `index.css` sets
 * `scroll-behavior: smooth` on `html` for the legal pages' contents links, so
 * every navigation would *animate* the whole way to the top rather than
 * starting there: on a long page a visible half-second of the page scrolling
 * itself. Removing the smooth rule to suit the router would trade one problem
 * for another — the anchors are the reason it exists. `behavior: "instant"`
 * below overrides the stylesheet for these scrolls only, and leaves the
 * anchors smooth.
 *
 * Three cases, because they genuinely differ:
 *
 *   **A new path** starts at the top. That is the fix.
 *
 *   **Back or forward** returns to where that path was left. Anything else
 *   punishes someone for going back — they came back to the listing to carry
 *   on from where they were, not to start it again.
 *
 *   **The same path with a different query** does not move at all. Filters,
 *   pagination and the gallery's lightbox are all query state on `/products`
 *   and `/gallery`; scrolling to the top every time a filter is ticked would
 *   be a worse bug than the one being fixed here.
 *
 * A hash is left alone in every case — the browser is already scrolling to
 * that element, and `--scroll-offset` clears the sticky header for it.
 */

/**
 * Remembered offsets, by path.
 *
 * A module-level `Map` rather than `sessionStorage`: this only has to outlive
 * a route change, not a reload, and on a reload the browser does its own
 * restoration anyway. Nothing to serialise, nothing to fall back to when
 * storage is unavailable, and no quota to think about.
 */
const positions = new Map();

export function ScrollManager() {
  const { pathname, search, hash } = useLocation();
  const navigationType = useNavigationType();
  const previous = useRef(null);

  // `useLayoutEffect`, not `useEffect`: this has to happen before the browser
  // paints. After it, the new page is on screen at the old offset for a frame
  // and the correction reads as a flicker.
  useLayoutEffect(() => {
    const previousPath = previous.current;
    previous.current = pathname;

    // React has rendered the new route, but nothing has scrolled yet — so the
    // window is still sitting where the *previous* route was left, which is
    // exactly the number worth remembering.
    if (previousPath !== null && previousPath !== pathname) {
      positions.set(previousPath, window.scrollY);
    }

    // Only the query changed: same page, same position.
    if (previousPath === pathname) return;

    // The browser is already scrolling to the element named in the hash.
    if (hash) return;

    window.scrollTo({
      top: navigationType === "POP" ? (positions.get(pathname) ?? 0) : 0,
      left: 0,
      behavior: "instant",
    });
  }, [pathname, search, hash, navigationType]);

  return null;
}
