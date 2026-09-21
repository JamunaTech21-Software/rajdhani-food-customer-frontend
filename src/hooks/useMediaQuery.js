import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether a media query matches, kept in step as the window changes.
 *
 * Only for the cases CSS genuinely cannot reach. A layout that differs by width
 * belongs in a Tailwind breakpoint, not here — this exists for the handful of
 * places where the *markup* has to differ, and the footer's disclosure is the
 * first of them: whether a heading is a button is not something a stylesheet
 * can decide.
 *
 * **`useSyncExternalStore`, not `useState` + `useEffect`.** `matchMedia` is an
 * external store, and this is the API React provides for reading one: it takes
 * the value during render rather than a frame later, so a desktop visitor never
 * sees the mobile arrangement flash before an effect corrects it, and it needs
 * no `setState` inside an effect — which `react-hooks/set-state-in-effect`
 * rejects, correctly, as a cascading render.
 *
 * `matchMedia` is guarded because it is absent outside a browser — the test
 * runner imports these modules — and the fallback is `false`, the narrow
 * layout. Narrow-first is the safe way round: a collapsed section opens with
 * one tap, where a desktop layout on a phone does not recover at all.
 */
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onStoreChange) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};

      const list = window.matchMedia(query);
      list.addEventListener("change", onStoreChange);
      return () => list.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  }, [query]);

  // The server snapshot must be a stable value, not a second read: React
  // compares the two and warns when they disagree.
  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
