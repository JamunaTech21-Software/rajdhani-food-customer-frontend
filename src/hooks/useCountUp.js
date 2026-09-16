import { useEffect, useRef, useState } from "react";

import { durationFor, frameValue } from "../lib/countUp.js";

/**
 * Count a stat up when it scrolls into view.
 *
 * Three things this has to get right, and the third is an acceptance criterion:
 *
 *   **Only when seen.** The stats band is below the fold; animating on mount
 *   means it has finished before anyone scrolls to it.
 *
 *   **Only once.** Re-animating every time the band scrolls back into view is
 *   a distraction, not a flourish.
 *
 *   **Not at all, for anyone who asked for that.** `prefers-reduced-motion`
 *   is set by people for whom movement causes nausea or seizures. The final
 *   value is shown immediately — the information is never withheld, only the
 *   motion is.
 *
 * Deliberately hand-rolled rather than pulling in an animation library: this is
 * one `requestAnimationFrame` loop, and a count-up does not justify ~50 kB on a
 * marketing page's critical path.
 */
export function useCountUp(value) {
  const [display, setDisplay] = useState(() => {
    // Rendered with the final value from the very first frame, so the number is
    // present for a crawler, for a reduced-motion visitor, and if JS fails.
    return String(value ?? "");
  });
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || started.current) return undefined;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // Nothing to do: the value is already displayed in full.
    if (reduced) return undefined;

    const duration = durationFor(value);
    if (duration === 0) return undefined;

    let frame = null;
    let observer = null;

    const run = () => {
      started.current = true;
      const startedAt = performance.now();

      const step = (now) => {
        const progress = (now - startedAt) / duration;

        if (progress >= 1) {
          setDisplay(String(value));
          return;
        }
        setDisplay(frameValue(value, progress));
        frame = requestAnimationFrame(step);
      };

      // Start from zero only now — not in initial state, so the final value is
      // what renders before the animation ever begins.
      setDisplay(frameValue(value, 0));
      frame = requestAnimationFrame(step);
    };

    if (typeof IntersectionObserver === "undefined") return undefined;

    observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        run();
      },
      { threshold: 0.4 },
    );

    observer.observe(element);

    return () => {
      observer?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [value]);

  return { ref, display };
}
