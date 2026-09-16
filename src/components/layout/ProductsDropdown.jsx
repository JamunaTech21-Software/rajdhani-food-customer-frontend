import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router";

import { Icon } from "../ui/Icon.jsx";
import { cn } from "../../lib/cn.js";
import { ALL_PRODUCTS, categoryLinks } from "../../lib/nav.js";

/**
 * The Products menu — a **disclosure**, not an ARIA menu.
 *
 * `role="menu"` is for application menus: a set of commands, driven by arrow
 * keys, where Tab leaves the whole group. This is a list of links to pages, and
 * screen-reader users expect links to behave like links. Wrapping navigation in
 * `role="menu"` makes a browser announce "menu item" for something that is a
 * link, and swallows the Tab key that people actually use to move through
 * navigation. So: a button with `aria-expanded`, revealing a plain list.
 *
 * It opens on click rather than hover. Hover menus are unusable on touch, and
 * a hover target that must stay hovered across a gap is a well-known trap for
 * anyone with imprecise pointer control.
 */
export function ProductsDropdown({ label = "Products", categories, isActive }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const containerRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      // Focus goes back to the control that opened it — otherwise Escape
      // leaves focus on a hidden element and the next Tab starts from the top.
      buttonRef.current?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const links = categoryLinks(categories);

  return (
    <div
      ref={containerRef}
      className="relative"
      // Closing on blur-out keeps a keyboard user from leaving an open panel
      // behind them as they Tab past it.
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex items-center gap-1 border-b-2 py-5 text-sm font-medium transition-colors duration-(--duration-fast)",
          isActive
            ? "border-brand text-brand"
            : "border-transparent text-ink hover:text-brand",
        )}
      >
        {label}
        <ChevronDown
          size={15}
          strokeWidth={2}
          aria-hidden="true"
          className={cn("transition-transform duration-(--duration-fast)", open && "rotate-180")}
        />
      </button>

      {/* Rendered only when open: a hidden-but-present panel is still in the
          tab order in some browsers, and `display:none` toggling is cheaper to
          reason about than managing inert. */}
      {open ? (
        <div
          id={panelId}
          className="absolute left-0 top-full z-50 w-64 rounded-lg border border-line bg-surface py-2 shadow-modal"
        >
          <ul>
            <li>
              <Link
                to={ALL_PRODUCTS.url}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-ink hover:bg-ground"
              >
                {ALL_PRODUCTS.label}
              </Link>
            </li>

            {links.length ? (
              <li aria-hidden="true" className="my-1 border-t border-line" />
            ) : null}

            {links.map((link) => (
              <li key={link.id}>
                <Link
                  to={link.url}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink hover:bg-ground"
                >
                  <Icon name={link.iconName} size={16} className="text-brand" />
                  <span className="min-w-0 flex-1 truncate">{link.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
