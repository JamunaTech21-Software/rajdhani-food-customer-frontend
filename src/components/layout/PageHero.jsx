import { ChevronRight, Home } from "lucide-react";
import { Link } from "react-router";

import { CloudinaryImage } from "../CloudinaryImage.jsx";
import { SIZES } from "../../lib/cloudinary.js";

/**
 * The inner-page banner: image, heading, subtitle, breadcrumb chip.
 *
 * Every page below the home page wears this in the comps — Contact first, then
 * About, Quality, Gallery and News — so it is one component rather than one per
 * page. The home hero is deliberately not this: it is full-height and carries
 * CTAs, which is a different thing that happens to look similar.
 *
 * `title` is a fallback, not content. The heading, eyebrow, subtitle and image
 * all come from the banner an editor placed at this placement; `title` only
 * covers the window before one exists, because a page with no `<h1>` is a page
 * with no accessible or indexable name. Everything an editor sets wins over it.
 */
export function PageHero({ banner, title, breadcrumb }) {
  const overlay = Math.min(Math.max(banner?.overlay_opacity ?? 55, 0), 100) / 100;
  const heading = banner?.title || title;

  return (
    <section aria-label={heading} className="relative isolate overflow-hidden">
      {banner?.desktop_image?.url ? (
        <CloudinaryImage
          src={banner.desktop_image.url}
          alt={banner.desktop_image.alt ?? ""}
          sizes={SIZES.full}
          priority
          className="absolute inset-0 -z-10 size-full"
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-brand-deep" />
      )}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-ink" style={{ opacity: overlay }} />

      <div className="mx-auto flex max-w-(--container-max) flex-col pb-12 pt-12 lg:pb-16 lg:pt-16 pl-(--gutter-l) pr-(--gutter-r)">
        <div className="max-w-xl">
          {banner?.eyebrow_text ? (
            <p className="text-eyebrow font-semibold uppercase tracking-[0.2em] text-gold">
              {banner.eyebrow_text}
            </p>
          ) : null}

          <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-ink-inverse sm:text-4xl lg:text-5xl">
            {heading}
            {banner?.title_highlight ? (
              <span className="block text-gold">{banner.title_highlight}</span>
            ) : null}
          </h1>

          {/* The short rule under the heading in every comp. */}
          <span aria-hidden="true" className="mt-4 block h-0.5 w-16 bg-gold" />

          {banner?.subtitle ? (
            <p className="mt-4 text-base leading-relaxed text-ink-inverse/85 sm:text-lg">
              {banner.subtitle}
            </p>
          ) : null}
        </div>

        {breadcrumb ? (
          <nav
            aria-label="Breadcrumb"
            /* Bottom-right of the banner on a wide screen, as drawn; below the
               heading on a narrow one, where there is no room beside it. */
            className="mt-8 self-start rounded-md bg-surface px-4 py-2 sm:mt-10 lg:-mb-16 lg:self-end lg:rounded-b-none"
          >
            <ol className="flex items-center gap-1.5 text-sm text-ink-muted">
              <li>
                <Link to="/" aria-label="Home" className="inline-flex hover:text-brand">
                  <Home size={15} strokeWidth={1.75} aria-hidden="true" />
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight size={13} strokeWidth={2} className="text-ink-subtle" />
              </li>
              <li aria-current="page" className="font-medium text-ink">
                {breadcrumb}
              </li>
            </ol>
          </nav>
        ) : null}
      </div>
    </section>
  );
}
