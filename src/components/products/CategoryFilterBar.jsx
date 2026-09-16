import { LayoutGrid } from "lucide-react";

import { Icon } from "../ui/Icon.jsx";
import { cn } from "../../lib/cn.js";

/**
 * The sticky category bar (§10.2), driven by `Category`.
 *
 * Buttons rather than links, because selecting a category is a change to the
 * current listing rather than a move to a different page — the page component
 * writes it to the URL, which is what makes it shareable and back-navigable.
 *
 * `aria-pressed` rather than `aria-current`: these are toggles on this view, not
 * pointers at another one.
 *
 * Every category is offered including empty ones, for the same reason as the
 * header dropdown: hiding them until a product exists would mean a category
 * created in admin is invisible to the person who just created it.
 */
export function CategoryFilterBar({ categories, active, onSelect }) {
  const items = categories ?? [];

  return (
    // top-16 matches the header's own height, so the bar comes to rest directly
    // under it rather than sliding beneath or leaving a strip of page showing.
    // z-30 sits below the header's z-40 for the same reason.
    <div className="sticky top-16 z-30 -mx-4 border-b border-line bg-surface/95 px-4 backdrop-blur-sm sm:-mx-6 sm:px-6">
      {/* Horizontally scrollable on a phone rather than wrapped into three
          rows, which would push the products themselves off-screen. */}
      <ul
        className="flex gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Filter by category"
      >
        <li>
          <button
            type="button"
            onClick={() => onSelect(null)}
            aria-pressed={!active}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-md px-4 py-2.5 text-sm font-medium transition-colors duration-(--duration-fast)",
              !active ? "bg-brand text-on-brand" : "text-ink hover:bg-ground",
            )}
          >
            <LayoutGrid size={16} strokeWidth={1.75} aria-hidden="true" />
            All Products
          </button>
        </li>

        {items.map((category) => {
          const selected = active === category.slug;

          return (
            <li key={category.id}>
              <button
                type="button"
                onClick={() => onSelect(category.slug)}
                aria-pressed={selected}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-md px-4 py-2.5 text-sm font-medium transition-colors duration-(--duration-fast)",
                  selected ? "bg-brand text-on-brand" : "text-ink hover:bg-ground",
                )}
              >
                <Icon name={category.icon_name} size={16} />
                {category.name}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
