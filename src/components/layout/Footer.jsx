import { Globe, Mail, MapPin, Phone, Send } from "lucide-react";
import { Link } from "react-router";

import { cn } from "../../lib/cn.js";
import { isExternal } from "../../lib/nav.js";
import { useSiteStore } from "../../stores/siteStore.js";
import { SocialIcon } from "../ui/SocialIcon.jsx";

/**
 * A footer link.
 *
 * `inline-block py-1` is the target, not the styling: a bare line of 14px text
 * is a 20px-tall thing to hit, which fails WCAG 2.5.8 even at its relaxed 24px
 * floor once the rows sit 10px apart. The padding takes each row to 28px and
 * `LinkColumn` gives back the same 8px from its gap, so the rhythm on screen is
 * exactly what it was and only the hit area changed.
 */
function FooterLink({ link, className }) {
  const classes = cn(
    "inline-block py-1 text-sm text-ink-inverse/75 transition-colors hover:text-ink-inverse",
    className,
  );

  if (isExternal(link.url)) {
    return (
      <a
        href={link.url}
        target={link.open_in_new_tab ? "_blank" : undefined}
        rel={link.open_in_new_tab ? "noopener noreferrer" : undefined}
        className={classes}
      >
        {link.label}
      </a>
    );
  }

  return (
    <Link to={link.url} className={classes}>
      {link.label}
    </Link>
  );
}

function LinkColumn({ title, links }) {
  // A heading above nothing is worse than no column — it reads as a rendering
  // failure rather than as an empty menu.
  if (!links?.length) return null;

  return (
    <nav aria-label={title}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-inverse">{title}</h2>
      <ul className="mt-4 flex flex-col gap-0.5">
        {links.map((link) => (
          <li key={link.id ?? link.url}>
            <FooterLink link={link} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Footer() {
  const site = useSiteStore((s) => s.site);
  const menus = useSiteStore((s) => s.menus);
  const social = useSiteStore((s) => s.social);
  const newsletterOn = useSiteStore((s) => s.newsletter?.enabled === true);

  const contact = site?.contact ?? {};
  const address = [contact.address_line, contact.city, contact.country].filter(Boolean).join(", ");

  return (
    <footer className="mt-16 bg-brand-deep text-ink-inverse">
      {/*
        Five blocks: the brand, three link lists and the newsletter.

        The old ramp stepped 1 → 2 → 3 → 5, and the three-column stop was the
        problem: five items in three columns is a full row and then two
        stranded ones, which reads as a mistake rather than as a layout. Each
        step here divides the five evenly instead — the brand block takes a row
        of its own until there is room for all five beside it, and the four
        lists split two-and-two or four across.

        768 deliberately keeps the 640 arrangement. Four link lists across a
        tablet would leave the newsletter's email field about 110px wide, which
        is narrower than the text people type into it.
      */}
      <div className="mx-auto grid max-w-(--container-max) gap-10 py-14 pl-(--gutter-l) pr-(--gutter-r) sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[1.4fr_1fr_1fr_1.2fr_1.2fr]">
        <div className="sm:col-span-2 lg:col-span-4 xl:col-span-1">
          <p className="font-display text-xl font-semibold">{site?.name ?? "Rajdhani Food Products"}</p>
          {site?.footer?.about ? (
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-inverse/75">
              {site.footer.about}
            </p>
          ) : null}

          {social.length ? (
            <ul className="mt-5 flex flex-wrap gap-2">
              {social.map((account) => (
                  <li key={account.url}>
                    <a
                      href={account.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      // The platform name, not "social link" — a list of five
                      // identical labels tells a screen-reader user nothing.
                      aria-label={`${account.platform} (opens in a new tab)`}
                      className="grid size-11 place-items-center rounded-full border border-ink-inverse/25 text-ink-inverse transition-colors hover:border-ink-inverse hover:bg-ink-inverse/10"
                    >
                      <SocialIcon platform={account.platform} size={16} />
                    </a>
                  </li>
                ))}
            </ul>
          ) : null}
        </div>

        <LinkColumn title="Quick Links" links={menus?.footer_quick} />
        <LinkColumn title="Products" links={menus?.footer_products} />

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-inverse">Contact Us</h2>
          <ul className="mt-4 flex flex-col gap-3 text-sm text-ink-inverse/75">
            {address ? (
              <li className="flex gap-2.5">
                <MapPin size={15} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" />
                <span>{address}</span>
              </li>
            ) : null}
            {contact.phone_primary ? (
              <li className="flex gap-2.5">
                <Phone size={15} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" />
                <a href={`tel:${contact.phone_primary.replace(/[^\d+]/g, "")}`} className="hover:text-ink-inverse">
                  {contact.phone_primary}
                </a>
              </li>
            ) : null}
            {contact.email_primary ? (
              <li className="flex gap-2.5">
                <Mail size={15} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" />
                <a href={`mailto:${contact.email_primary}`} className="break-all hover:text-ink-inverse">
                  {contact.email_primary}
                </a>
              </li>
            ) : null}
            {contact.website_url ? (
              <li className="flex gap-2.5">
                <Globe size={15} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" />
                <a href={contact.website_url} className="break-all hover:text-ink-inverse">
                  {contact.website_url.replace(/^https?:\/\//, "")}
                </a>
              </li>
            ) : null}
          </ul>
        </div>

        {/* Rendered only when the setting says so — the form posts to an
            endpoint that is switched off with it. RTPP-65 wires the submit. */}
        {newsletterOn ? (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-inverse">Newsletter</h2>
            <p className="mt-4 text-sm text-ink-inverse/75">
              Subscribe to get updates on new products and offers.
            </p>
            <form
              className="mt-4 flex gap-2"
              onSubmit={(event) => event.preventDefault()}
              aria-label="Newsletter sign-up"
            >
              <label htmlFor="footer-newsletter" className="sr-only">
                Email address
              </label>
              <input
                id="footer-newsletter"
                type="email"
                required
                placeholder="Enter your email"
                className="h-11 min-w-0 flex-1 rounded-md bg-surface px-3 text-sm text-ink"
              />
              <button
                type="submit"
                aria-label="Subscribe"
                className="grid size-11 shrink-0 place-items-center rounded-md bg-gold text-on-gold"
              >
                <Send size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            </form>
          </div>
        ) : null}
      </div>

      <div className="border-t border-ink-inverse/15">
        <div className="mx-auto flex max-w-(--container-max) flex-wrap items-center justify-between gap-3 py-5 pl-(--gutter-l) pr-(--gutter-r) pb-[max(1.25rem,env(safe-area-inset-bottom))] text-sm text-ink-inverse/70">
          <p>{site?.footer?.copyright ?? `© ${new Date().getFullYear()} Rajdhani Food Products`}</p>

          {menus?.legal?.length ? (
            <nav aria-label="Legal">
              <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {menus.legal.map((link) => (
                  <li key={link.id ?? link.url}>
                    <FooterLink link={link} />
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
