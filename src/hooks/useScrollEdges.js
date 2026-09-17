import { useCallback, useEffect, useRef, useState } from "react";

import { scrollEdges } from "../lib/scrollEdges.js";

/**
 * Track which edges of a horizontal scroller have more content behind them.
 *
 * Returns a ref to put on the scrolling element and the two data attributes to
 * spread onto it; `index.css`'s `.scroll-fade` keys its mask off them, so the
 * fade appears at an edge only while there is something past it.
 *
 * Three things have to be watched, not one:
 *
 *   * **scroll** — the obvious one.
 *   * **resize** — a strip that overflowed at 360px may fit at 768px, and the
 *     fade has to go when it does. `ResizeObserver` on the element itself
 *     rather than a window listener, because the element's width also changes
 *     when a sibling column appears beside it.
 *   * **content** — the strips are filled from the API, so the first measure
 *     has to happen after the items arrive, not on mount.
 *
 * The listener is passive: it never calls `preventDefault`, and saying so keeps
 * scrolling off the main thread's critical path.
 */
export function useScrollEdges() {
  const ref = useRef(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const node = ref.current;
    if (!node) return;

    const next = scrollEdges(node);
    // Compared before setting: `scroll` fires per frame while a finger moves,
    // and an unchanged object would re-render the strip on every one of them.
    setEdges((current) =>
      current.start === next.start && current.end === next.end ? current : next,
    );
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    measure();
    node.addEventListener("scroll", measure, { passive: true });

    // Covers both the viewport changing and the items arriving — a mutation to
    // the children changes the element's scroll width, which this reports.
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    for (const child of node.children) observer.observe(child);

    return () => {
      node.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [measure]);

  /*
    A tuple rather than an object with a `ref` key: `react-hooks/refs` reads any
    `thing.ref` in JSX as reaching into a ref during render and refuses it. Two
    plain bindings say what they are.
  */
  return [ref, { "data-overflow-start": edges.start, "data-overflow-end": edges.end }];
}
