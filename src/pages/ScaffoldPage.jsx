import { CloudinaryImage } from "../components/CloudinaryImage.jsx";
import { retryBootstrap } from "../lib/bootstrap.js";
import { SIZES } from "../lib/cloudinary.js";
import { useSiteStore } from "../stores/siteStore.js";

/**
 * A scaffold check, not a page.
 *
 * It shows the three things RTPP-56 and RTPP-57 are accountable for, on screen
 * rather than only in a test: the theme arrived from the API and is driving the
 * tokens, an image went through the Cloudinary helper, and the page is readable
 * in all three boot states. RTPP-59 replaces this route with the real home page.
 */
export function ScaffoldPage() {
  const status = useSiteStore((s) => s.status);
  const site = useSiteStore((s) => s.site);
  const menus = useSiteStore((s) => s.menus);
  const social = useSiteStore((s) => s.social);

  const failed = status === "fallback";

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-eyebrow uppercase tracking-wide text-brand">Scaffold</p>
      <h1 className="mt-2 text-4xl font-semibold text-ink">
        {site?.name ?? "Rajdhani Food Products"}
      </h1>
      <p className="mt-2 text-ink-muted">
        {site?.tagline ?? (failed ? "Showing built-in defaults." : "Loading the site profile…")}
      </p>

      <div className="mt-6 h-1 w-16 rounded-full bg-gold" />

      {failed ? (
        <div role="alert" className="mt-8 rounded-md bg-warning-tint p-4 text-sm text-warning">
          <p className="font-medium">The site profile could not be loaded.</p>
          <p className="mt-1">
            Everything below is rendering from the built-in fallback colours — the page is usable,
            it is just not reading the admin&apos;s current settings.
          </p>
          <button
            type="button"
            onClick={() => retryBootstrap()}
            className="mt-3 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-on-brand"
          >
            Try again
          </button>
        </div>
      ) : null}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink">Theme, from the API</h2>
        <p className="mt-1 text-sm text-ink-muted">
          These swatches read the CSS custom properties the boot wrote. Change a colour in the
          dashboard and reload — they follow, with no code change.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Brand", className: "bg-brand text-on-brand" },
            { label: "Brand dark", className: "bg-brand-dark text-on-brand" },
            { label: "Brand tint", className: "bg-brand-tint text-ink" },
            { label: "Gold", className: "bg-gold text-on-gold" },
          ].map(({ label, className }) => (
            <div key={label} className={`rounded-lg px-3 py-6 text-sm font-medium ${className}`}>
              {label}
            </div>
          ))}
        </div>

        <dl className="mt-4 grid gap-1 text-sm">
          {[
            ["Boot status", status],
            ["primary_color", site?.theme?.primary ?? "—"],
            ["secondary_color", site?.theme?.secondary ?? "—"],
            ["Header links", menus ? String(menus.header?.length ?? 0) : "—"],
            ["Social links", String(social.length)],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-2">
              <dt className="w-36 shrink-0 text-ink-muted">{label}</dt>
              <dd className="font-mono text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink">Image pipeline</h2>
        <p className="mt-1 text-sm text-ink-muted">
          The logo, through <code>CloudinaryImage</code>. The seeded URLs are placeholders rather
          than Cloudinary assets, so this one passes through untransformed — which is the point: an
          external URL must not have <code>f_auto</code> spliced into it.
        </p>

        <div className="mt-4 w-48 overflow-hidden rounded-lg border border-line">
          <CloudinaryImage
            src={site?.logos?.light?.url}
            alt={site?.logos?.light?.alt ?? site?.name ?? ""}
            width={512}
            height={512}
            sizes={SIZES.thumbnail}
            priority
          />
        </div>
      </section>
    </main>
  );
}
