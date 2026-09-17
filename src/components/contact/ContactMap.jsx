import { ExternalLink, MapPin } from "lucide-react";

/**
 * The embedded map with its pin card (§10.4).
 *
 * The frame is Google Maps' keyless embed — `output=embed`, built in
 * `mapLocation()`. No Maps API key exists in this project and none is needed for
 * it, which is the difference between a map and a grey box asking for one.
 *
 * Two things have to be true for this to render rather than fail silently:
 *
 *   * coordinates are set (they are null, never 0, when they are not — the page
 *     shows no map at all rather than a view of the Gulf of Guinea), and
 *   * the CSP allows `frame-src https://www.google.com` — the second acceptance
 *     criterion. A missing directive blocks the iframe with nothing on the page
 *     to say so. See `csp.js`.
 */
export function ContactMap({ location, name, address }) {
  if (!location) return null;

  return (
    <div className="relative isolate h-full min-h-[420px] overflow-hidden rounded-xl border border-line bg-ground">
      <iframe
        title={location.title}
        src={location.embedSrc}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        className="absolute inset-0 size-full border-0"
      />

      {/*
        The pin card sits over the frame. It is not `pointer-events-none` — the
        Google Maps link inside it is the point — but the panel around it is,
        so the map underneath can still be dragged everywhere else.
      */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center p-4">
        <div className="pointer-events-auto flex max-w-xs gap-3 rounded-lg bg-surface p-4 shadow-modal">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-on-brand">
            <MapPin size={19} strokeWidth={1.75} aria-hidden="true" />
          </span>

          <div className="min-w-0">
            {name ? <p className="font-display font-semibold leading-snug text-ink">{name}</p> : null}
            {address ? <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{address}</p> : null}

            <a
              href={location.linkUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
            >
              View on Google Maps
              <ExternalLink size={13} strokeWidth={2} aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
