import { Heart } from "lucide-react";

import { cn } from "../../lib/cn.js";
import { useWishlistStore } from "../../stores/wishlistStore.js";

/**
 * The save toggle, on every product card and on the detail page (§10.2).
 *
 * `aria-pressed` rather than two labels: it is one control with two states, and
 * a screen reader announces the change itself. The visible label changes too,
 * because "Save" and "Saved" are what a sighted user reads, but the state is
 * carried by the attribute so the two cannot drift.
 *
 * On a card the button sits over the image, which is inside the card's own
 * stretched link — so it needs `relative z-10` and it stops the click from
 * reaching that link. Without the second, saving a product navigates to it.
 */
export function WishlistButton({ product, variant = "icon", className }) {
  const saved = useWishlistStore((s) => s.ids.has(product?.id));
  const toggle = useWishlistStore((s) => s.toggle);

  if (!product?.id) return null;

  const label = saved ? "Saved to your wishlist" : "Save to your wishlist";

  const press = (event) => {
    // The card wraps everything in a link with `after:inset-0`. A click here is
    // about this button, not about navigating.
    event.preventDefault();
    event.stopPropagation();
    toggle(product);
  };

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={press}
        aria-pressed={saved}
        className={cn(
          "inline-flex h-12 items-center justify-center gap-2 rounded-md border px-5 text-sm font-medium",
          "transition-colors duration-(--duration-fast)",
          saved ? "border-brand bg-brand-tint text-brand" : "border-line text-ink hover:border-brand hover:text-brand",
          className,
        )}
      >
        <Heart size={16} strokeWidth={2} aria-hidden="true" className={saved ? "fill-current" : undefined} />
        {saved ? "Saved" : "Save"}
        <span className="sr-only">{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={press}
      aria-pressed={saved}
      aria-label={label}
      className={cn(
        "relative z-10 grid size-11 place-items-center rounded-full bg-surface/90 shadow-card backdrop-blur-sm",
        "transition-colors duration-(--duration-fast) hover:bg-surface",
        saved ? "text-brand" : "text-ink-muted hover:text-brand",
        className,
      )}
    >
      <Heart size={18} strokeWidth={2} aria-hidden="true" className={saved ? "fill-current" : undefined} />
    </button>
  );
}
