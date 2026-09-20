import * as Dialog from "@radix-ui/react-dialog";
import { Phone, User, X } from "lucide-react";
import { Link, useLocation } from "react-router";

import { Icon } from "../ui/Icon.jsx";
import { cn } from "../../lib/cn.js";
import { ALL_PRODUCTS, categoryLinks, isActiveLink, isExternal } from "../../lib/nav.js";
import { useAuthStore } from "../../stores/authStore.js";

/**
 * Navigation on a phone.
 *
 * A Dialog rather than a hand-rolled panel, because the hard part is focus: a
 * drawer must trap Tab inside itself while open, restore focus to the trigger
 * when it closes, and hide the page behind it from screen readers. Each of those
 * is easy to get subtly wrong, and RTPP-58's second criterion is exactly that
 * this be keyboard-navigable.
 *
 * Categories are listed inline rather than behind a second disclosure — on a
 * phone an accordion inside a drawer is two taps to reach a link that could have
 * been one, and the list is short enough to scroll.
 */
export function MobileDrawer({ open, onOpenChange, links, categories, phone }) {
  const { pathname } = useLocation();
  const session = useAuthStore((s) => s.status);
  const categoryItems = categoryLinks(categories);

  const close = () => onOpenChange(false);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 lg:hidden" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 flex w-80 max-w-[85%] flex-col bg-surface pr-(--gutter-r) pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-modal lg:hidden"
        >
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <Dialog.Title className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Menu
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close menu"
              className="grid size-11 place-items-center rounded-md text-ink-subtle hover:bg-ground hover:text-ink"
            >
              <X size={18} strokeWidth={1.75} aria-hidden="true" />
            </Dialog.Close>
          </div>

          <nav aria-label="Main" className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
            <ul>
              {links.map((link) => {
                const active = isActiveLink(pathname, link.url);
                const external = isExternal(link.url);

                return (
                  <li key={link.id ?? link.url}>
                    {external ? (
                      <a
                        href={link.url}
                        target={link.open_in_new_tab ? "_blank" : undefined}
                        rel={link.open_in_new_tab ? "noopener noreferrer" : undefined}
                        onClick={close}
                        className="block rounded-md px-3 py-2.5 text-base text-ink hover:bg-ground"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.url}
                        onClick={close}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "block rounded-md px-3 py-2.5 text-base hover:bg-ground",
                          active ? "font-semibold text-brand" : "text-ink",
                        )}
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>

            {categoryItems.length ? (
              <>
                <p className="mt-4 px-3 text-eyebrow uppercase tracking-wide text-ink-subtle">
                  Shop by category
                </p>
                {/*
                  `py-3` on the category rows, not `py-2`: at 20px of line box
                  that was a 36px target, on the one surface that is only ever
                  used with a thumb. The pitch grows by 8px a row, which the
                  drawer already scrolls for.
                */}
                <ul className="mt-1">
                  <li>
                    <Link
                      to={ALL_PRODUCTS.url}
                      onClick={close}
                      className="block rounded-md px-3 py-3 text-sm font-medium text-ink hover:bg-ground"
                    >
                      {ALL_PRODUCTS.label}
                    </Link>
                  </li>
                  {categoryItems.map((item) => (
                    <li key={item.id}>
                      <Link
                        to={item.url}
                        onClick={close}
                        className="flex items-center gap-2.5 rounded-md px-3 py-3 text-sm text-ink hover:bg-ground"
                      >
                        <Icon name={item.iconName} size={16} className="text-brand" />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </nav>

          {/* The account link, on the one surface where the header has no room
              for it. Above the phone CTA because it is navigation and that is
              an action. */}
          <div className="border-t border-line p-2">
            <Link
              to="/account"
              onClick={close}
              className="flex items-center gap-2.5 rounded-md px-3 py-3 text-sm font-medium text-ink hover:bg-ground"
            >
              <User size={17} strokeWidth={1.75} aria-hidden="true" className="text-brand" />
              {session === "authenticated" ? "Your account" : "Sign in"}
            </Link>
          </div>

          {phone ? (
            <div className="border-t border-line p-4">
              <a
                href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                className="flex h-11 items-center justify-center gap-2 rounded-md bg-brand text-sm font-medium text-on-brand"
              >
                <Phone size={16} strokeWidth={2} aria-hidden="true" />
                Get In Touch
              </a>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
