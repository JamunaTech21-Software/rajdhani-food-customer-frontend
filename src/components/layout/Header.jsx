import { Menu, Phone, User } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router";

import { CloudinaryImage } from "../CloudinaryImage.jsx";
import { cn } from "../../lib/cn.js";
import { brandLogo } from "../../lib/brand.js";
import { initials } from "../../lib/session.js";
import { isActiveLink, isExternal } from "../../lib/nav.js";
import { SIZES } from "../../lib/cloudinary.js";
import { useCategories } from "../../hooks/useCategories.js";
import { useAuthStore } from "../../stores/authStore.js";
import { useSiteStore } from "../../stores/siteStore.js";
import { MobileDrawer } from "./MobileDrawer.jsx";
import { ProductsDropdown } from "./ProductsDropdown.jsx";

// The one header link that opens a menu instead of navigating. Matched on the
// URL rather than the label, so renaming it in admin does not break the menu.
const PRODUCTS_URL = "/products";

export function Header() {
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const site = useSiteStore((s) => s.site);
  const menus = useSiteStore((s) => s.menus);
  const status = useSiteStore((s) => s.status);

  const session = useAuthStore((s) => s.status);
  const customer = useAuthStore((s) => s.customer);

  const categories = useCategories();
  const links = menus?.header ?? [];

  const phone = site?.contact?.phone_primary;
  const logo = brandLogo(site?.logos?.light, site?.name);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto flex max-w-(--container-max) items-center gap-3 pl-(--gutter-l) pr-(--gutter-r) lg:gap-6">
        {/* min-w-0 so the wordmark can truncate instead of forcing the row
            wider than the viewport on a narrow phone. */}
        <Link to="/" className="flex min-w-0 shrink items-center gap-2.5 py-3">
          <CloudinaryImage
            src={logo.url}
            alt={logo.alt}
            width={40}
            height={40}
            sizes={SIZES.thumbnail}
            priority
            className="size-9 shrink-0 sm:size-10"
            imgClassName="object-contain"
          />
          {/*
            The wordmark holds at 16px until `xl`. Between 1024 and about 1150
            the nav and the CTA take everything, and at 18px the name truncated
            to "RAJDHANI FOOD PRO…" — a brand name cut mid-word is worse than a
            brand name two points smaller.
          */}
          <span className="truncate text-sm font-bold uppercase leading-tight tracking-tight text-brand sm:text-base xl:text-lg">
            {site?.name ?? "Rajdhani Food Products"}
          </span>
        </Link>

        {/* shrink-0 on the nav: it is the content that must not be squeezed —
            the wordmark gives way first. */}
        <nav aria-label="Main" className="ml-auto hidden shrink-0 lg:block">
          <ul className="flex items-center gap-4 xl:gap-6">
            {links.map((link) => {
              const active = isActiveLink(pathname, link.url);

              if (link.url === PRODUCTS_URL) {
                return (
                  <li key={link.id ?? link.url}>
                    <ProductsDropdown
                      label={link.label}
                      categories={categories.data}
                      isActive={active}
                    />
                  </li>
                );
              }

              return (
                <li key={link.id ?? link.url}>
                  {isExternal(link.url) ? (
                    <a
                      href={link.url}
                      target={link.open_in_new_tab ? "_blank" : undefined}
                      rel={link.open_in_new_tab ? "noopener noreferrer" : undefined}
                      className="block border-b-2 border-transparent py-5 text-sm font-medium text-ink hover:text-brand"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      to={link.url}
                      // aria-current is what a screen reader announces; the
                      // underline is only visible to people who can see it.
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "block border-b-2 py-5 text-sm font-medium transition-colors duration-(--duration-fast)",
                        active
                          ? "border-brand text-brand"
                          : "border-transparent text-ink hover:text-brand",
                      )}
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/*
          Persistent CTA (§10.5). A tel: link rather than a route — the comps
          show a phone icon, and on a phone this should dial.

          It drops to the icon alone between 1024 and 1280, where the eight nav
          links plus a 150px button leave the logo about 227px and the wordmark
          truncates. The label stays in the accessibility tree at every width —
          `sr-only` rather than `hidden`, so it is still announced — and the
          button keeps its 44px target from `w-11`.
        */}
        {phone ? (
          <a
            href={`tel:${phone.replace(/[^\d+]/g, "")}`}
            className="hidden h-11 w-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-brand text-sm font-medium text-on-brand transition-colors duration-(--duration-fast) hover:bg-brand-dark lg:flex xl:w-auto xl:px-4"
          >
            <Phone size={15} strokeWidth={2} aria-hidden="true" />
            <span className="sr-only xl:not-sr-only">Get In Touch</span>
          </a>
        ) : null}

        {/*
          The account entry point (§10.5, RTPP-68).

          Three states, because `status` is three-valued: while it is "unknown"
          the refresh cookie is still being exchanged, and showing "Sign in" to
          someone who is about to be restored as signed in — then swapping it for
          their avatar — is a flicker on every page load.

          An icon rather than a name at this size: the row already carries the
          wordmark, the nav and the phone CTA, and a name of unknown length is
          what pushed the wordmark into truncating (F7).
        */}
        {session === "authenticated" ? (
          <Link
            to="/account"
            aria-label={`Your account, ${customer?.name ?? "signed in"}`}
            className="hidden size-11 shrink-0 place-items-center rounded-full text-ink transition-colors duration-(--duration-fast) hover:bg-ground lg:grid"
          >
            {customer?.avatar_url ? (
              <img
                src={customer.avatar_url}
                alt=""
                width={32}
                height={32}
                referrerPolicy="no-referrer"
                className="size-8 rounded-full object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="grid size-8 place-items-center rounded-full bg-brand-tint text-xs font-semibold text-brand"
              >
                {initials(customer)}
              </span>
            )}
          </Link>
        ) : session === "anonymous" ? (
          <Link
            to="/account"
            className="hidden size-11 shrink-0 place-items-center rounded-full text-ink transition-colors duration-(--duration-fast) hover:bg-ground lg:grid"
          >
            <User size={19} strokeWidth={1.75} aria-hidden="true" />
            <span className="sr-only">Sign in</span>
          </Link>
        ) : (
          // "unknown": hold the space so nothing shifts when it resolves.
          <span aria-hidden="true" className="hidden size-11 shrink-0 lg:block" />
        )}

        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="ml-auto grid size-11 shrink-0 place-items-center rounded-md text-ink hover:bg-ground lg:hidden"
        >
          <Menu size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      {/* A thin progress hint while the layout is still arriving, so the empty
          nav reads as "loading" rather than "this site has no navigation". */}
      {status === "loading" ? (
        <div aria-hidden="true" className="h-0.5 w-full animate-pulse bg-brand-tint" />
      ) : null}

      <MobileDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        links={links}
        categories={categories.data}
        phone={phone}
      />
    </header>
  );
}
