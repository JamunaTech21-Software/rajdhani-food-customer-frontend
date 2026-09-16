import { useQuery } from "@tanstack/react-query";

import { CloudinaryImage } from "../components/CloudinaryImage.jsx";
import { publicApi } from "../lib/api.js";
import { SIZES } from "../lib/cloudinary.js";

/**
 * A scaffold check, not a page.
 *
 * It proves the three things RTPP-56 is accountable for, on screen rather than
 * in a test: the theme arrived from the API, the tokens are driving the colours,
 * and an image is being served through the Cloudinary helper. RTPP-57 replaces
 * this route with the real home page.
 */
export function ScaffoldPage() {
  const layout = useQuery({
    queryKey: ["public", "layout"],
    queryFn: () => publicApi.get("/public/layout"),
  });

  const site = layout.data?.site;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-eyebrow uppercase tracking-wide text-brand">Scaffold</p>
      <h1 className="mt-2 text-4xl font-semibold text-ink">
        {site?.name ?? "Rajdhani Food Products"}
      </h1>
      <p className="mt-2 text-ink-muted">{site?.tagline ?? "Loading the site profile…"}</p>

      <div className="mt-6 h-1 w-16 rounded-full bg-gold" />

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink">Theme, from the API</h2>
        <p className="mt-1 text-sm text-ink-muted">
          These swatches read the CSS custom properties that <code>applyTheme</code> wrote at boot.
          Change a colour in the dashboard and reload — they follow, with no code change.
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
          <div className="flex gap-2">
            <dt className="text-ink-muted">primary_color</dt>
            <dd className="font-mono text-ink">{site?.theme?.primary ?? "—"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-muted">secondary_color</dt>
            <dd className="font-mono text-ink">{site?.theme?.secondary ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink">Image pipeline</h2>
        <p className="mt-1 text-sm text-ink-muted">
          The logo, through <code>CloudinaryImage</code>. The seeded URLs are placeholders rather
          than Cloudinary assets, so this one passes through untransformed — which is the point:
          an external URL must not have <code>f_auto</code> spliced into it.
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

      {layout.isError ? (
        <p role="alert" className="mt-8 rounded-md bg-danger-tint p-3 text-sm text-danger">
          Could not reach the API — the tokens.css fallback is what you are seeing.
        </p>
      ) : null}
    </main>
  );
}
