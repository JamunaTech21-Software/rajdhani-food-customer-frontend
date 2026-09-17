import { useQuery } from "@tanstack/react-query";

import { ContactDetails } from "../components/contact/ContactDetails.jsx";
import { ContactForm } from "../components/contact/ContactForm.jsx";
import { ContactMap } from "../components/contact/ContactMap.jsx";
import { PageHero } from "../components/layout/PageHero.jsx";
import { publicApi } from "../lib/api.js";
import { mapLocation } from "../lib/contact.js";
import { useSiteStore } from "../stores/siteStore.js";

/**
 * The contact page (§10.4).
 *
 * Nothing on it is written here. The card, the map pin and the map itself all
 * read the `site_profile` contact block and map coordinates out of the site
 * store — the payload fetched once at boot (RTPP-57) — so changing the address
 * or a phone number in the dashboard changes this page with no deploy, which is
 * the first acceptance criterion. The second lives in `csp.js`: the map is an
 * iframe, and an iframe is what a default CSP blocks silently.
 *
 * **The assurance strip has no public data source.** Those five cards are
 * `FeatureItem` rows in a non-`HOME` section, and `/public/feature-items` is not
 * exposed — the same gap that left four sections off the dealer page. Hardcoding
 * the copy would put content in the bundle and take it out of the editors'
 * hands, against §18.2, so the strip is absent until the endpoint exists.
 */
export function ContactPage() {
  const site = useSiteStore((s) => s.site);
  const status = useSiteStore((s) => s.status);

  const hero = useQuery({
    queryKey: ["public", "banners", "CONTACT_HERO"],
    queryFn: () => publicApi.list("/public/banners", { params: { placement: "CONTACT_HERO" } }),
    staleTime: 5 * 60_000,
  });

  const contact = site?.contact;
  const address = [contact?.address_line, contact?.city, contact?.country].filter(Boolean).join(", ");
  const location = mapLocation(site?.map, { name: site?.name, address });

  return (
    <>
      <PageHero banner={hero.data?.items?.[0]} title="Contact Us" breadcrumb="Contact Us" />

      <div className="mx-auto max-w-(--container-max) py-(--space-section) pl-(--gutter-l) pr-(--gutter-r)">
        {/*
          Card, form, map. The form is the widest of the three in the comps, and
          the map only earns its width once there is room for both others beside
          it — so the map drops below at the tablet step rather than being
          squeezed into a third of a narrow screen.
        */}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,19rem)_minmax(0,1.4fr)_minmax(0,1.1fr)]">
          <section aria-labelledby="contact-details-heading" className="rounded-xl border border-line bg-surface p-6">
            <h2 id="contact-details-heading" className="font-display text-xl font-bold text-ink">
              Get In Touch
            </h2>
            <span aria-hidden="true" className="mt-3 mb-5 block h-0.5 w-12 bg-gold" />

            <ContactDetails contact={contact} loading={status === "loading"} />
          </section>

          <section aria-labelledby="contact-form-heading" className="rounded-xl border border-line bg-surface p-6">
            <h2 id="contact-form-heading" className="font-display text-xl font-bold text-ink">
              Send Us a Message
            </h2>
            <span aria-hidden="true" className="mt-3 mb-5 block h-0.5 w-12 bg-gold" />

            <ContactForm />
          </section>

          {/*
            Absent rather than empty when no coordinates are set: the grid has
            one fewer column and the other two take the width.

            The span is the fix for 1024–1279, where the grid is two columns and
            three panels. Without it the map wrapped into the second row *under
            the detail card* and rendered 304px wide — a map too narrow to read
            a street name on. Spanning the row gives it the full width until
            there is a third column to put it in.
          */}
          {location ? (
            <div className="lg:col-span-2 xl:col-span-1">
              <ContactMap location={location} name={site?.name} address={address} />
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
