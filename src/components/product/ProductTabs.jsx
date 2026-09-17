import { useId, useState } from "react";

import { cn } from "../../lib/cn.js";
import { useScrollEdges } from "../../hooks/useScrollEdges.js";

/**
 * The product's content tabs (§10.2).
 *
 * Which tabs exist is decided by `visibleTabs()` — empty ones never reach here.
 * This component only has to render what it is given, which is why the
 * acceptance criterion is tested against that function rather than against a
 * rendered page.
 *
 * A real tab pattern, since this *is* an application widget rather than
 * navigation: arrow keys move between tabs, Home/End jump to the ends, and only
 * the selected tab is in the tab order — Tab from the strip goes into the panel.
 */
export function ProductTabs({ tabs, renderPanel }) {
  const baseId = useId();
  const [active, setActive] = useState(0);
  const [stripRef, stripProps] = useScrollEdges();

  if (!tabs?.length) return null;

  const current = tabs[Math.min(active, tabs.length - 1)];

  function onKeyDown(event) {
    const last = tabs.length - 1;
    const moves = {
      ArrowRight: active >= last ? 0 : active + 1,
      ArrowLeft: active <= 0 ? last : active - 1,
      Home: 0,
      End: last,
    };

    const next = moves[event.key];
    if (next === undefined) return;

    event.preventDefault();
    setActive(next);
    // Focus follows selection, which is the expected behaviour for a tab list
    // whose panels are cheap to render.
    document.getElementById(`${baseId}-tab-${next}`)?.focus();
  }

  return (
    <div className="rounded-xl border border-line bg-surface">
      <div
        role="tablist"
        aria-label="Product information"
        onKeyDown={onKeyDown}
        ref={stripRef}
        {...stripProps}
        className="scroll-fade flex gap-1 overflow-x-auto border-b border-line px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            id={`${baseId}-tab-${i}`}
            role="tab"
            type="button"
            aria-selected={i === active}
            aria-controls={`${baseId}-panel-${i}`}
            // Only the selected tab is reachable by Tab; the rest are reached
            // with arrow keys, which is what a tablist is meant to do.
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            className={cn(
              "whitespace-nowrap border-b-2 px-4 py-3.5 text-sm font-medium transition-colors duration-(--duration-fast)",
              i === active
                ? "border-brand text-brand"
                : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        id={`${baseId}-panel-${active}`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${active}`}
        // tabIndex 0 so a keyboard user can scroll a long panel without first
        // finding something focusable inside it.
        tabIndex={0}
        className="p-6"
      >
        {current.html ? (
          <div
            // Rich text the API has already sanitised (`RichText::sanitize()`).
            className="max-w-prose text-base leading-relaxed text-ink-muted [&_a]:text-brand [&_a]:underline [&_h3]:mt-4 [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-3 [&_ul]:mt-3"
            dangerouslySetInnerHTML={{ __html: current.html }}
          />
        ) : (
          renderPanel?.(current) ?? null
        )}
      </div>
    </div>
  );
}
