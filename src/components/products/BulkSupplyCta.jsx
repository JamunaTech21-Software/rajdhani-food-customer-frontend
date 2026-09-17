import { ArrowRight, Download } from "lucide-react";
import { Link } from "react-router";

import { CloudinaryImage } from "../CloudinaryImage.jsx";
import { SIZES } from "../../lib/cloudinary.js";
import { isExternal } from "../../lib/nav.js";

function Action({ label, url, variant }) {
  if (!label || !url) return null;

  const primary = variant === "primary";
  const className = primary
    ? "inline-flex h-12 items-center gap-2 rounded-md bg-brand px-6 text-sm font-medium text-on-brand transition-colors duration-(--duration-fast) hover:bg-brand-dark"
    : "inline-flex h-12 items-center gap-2 text-sm font-medium text-brand hover:underline";

  const Glyph = /^\/downloads\//.test(url) ? Download : ArrowRight;
  const content = (
    <>
      {label}
      <Glyph size={16} strokeWidth={2} aria-hidden="true" />
    </>
  );

  return isExternal(url) ? (
    <a href={url} className={className}>
      {content}
    </a>
  ) : (
    <Link to={url} className={className}>
      {content}
    </Link>
  );
}

/**
 * The bulk-supply block (§10.2) — the `DEALER_CTA` banner.
 *
 * Content-driven rather than written out, so the copy and both CTAs are
 * editable without a deploy. Renders nothing when no banner is active, which is
 * also how it respects the banner's own schedule: the API never returns one
 * outside its `starts_at`/`ends_at` window.
 */
export function BulkSupplyCta({ banner }) {
  if (!banner) return null;

  return (
    <section
      aria-labelledby="bulk-supply-heading"
      className="overflow-hidden rounded-xl bg-ground-warm"
    >
      <div className="grid items-center gap-8 md:grid-cols-[1fr_1.2fr]">
        {banner.desktop_image?.url ? (
          <CloudinaryImage
            src={banner.desktop_image.url}
            alt={banner.desktop_image.alt ?? ""}
            aspectRatio="4 / 3"
            sizes={SIZES.splitWide}
            className="size-full"
          />
        ) : null}

        <div className="px-6 py-10 md:px-10">
          {banner.eyebrow_text ? (
            <p className="text-eyebrow font-semibold uppercase tracking-[0.2em] text-brand">
              {banner.eyebrow_text}
            </p>
          ) : null}

          <h2 id="bulk-supply-heading" className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">
            {banner.title}
            {banner.title_highlight ? (
              <span className="text-brand"> {banner.title_highlight}</span>
            ) : null}
          </h2>

          {banner.subtitle ? (
            <p className="mt-3 max-w-md text-ink-muted">{banner.subtitle}</p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Action label={banner.primary_cta_label} url={banner.primary_cta_url} variant="primary" />
            <Action label={banner.secondary_cta_label} url={banner.secondary_cta_url} />
          </div>
        </div>
      </div>
    </section>
  );
}
