import { Clock, Globe, Mail, MapPin, Phone } from "lucide-react";

import { contactDetails } from "../../lib/contact.js";

/**
 * Fixed structural icons, not the editor-named ones.
 *
 * `ui/icon-registry.js` exists to resolve names an editor typed into a content
 * field. These five are the card's own furniture — "Phone" is always a phone —
 * so they are chosen here rather than being made configurable and then never
 * configured.
 */
const ICONS = { "map-pin": MapPin, phone: Phone, mail: Mail, globe: Globe, clock: Clock };

function Line({ line }) {
  if (!line.href) return <span className="block">{line.text}</span>;

  const external = line.href.startsWith("http");

  return (
    <a
      href={line.href}
      {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
      className="block break-words text-ink-muted transition-colors duration-(--duration-fast) hover:text-brand"
    >
      {line.text}
    </a>
  );
}

/**
 * The "Get In Touch" card (§10.4).
 *
 * Every line comes from the `site_profile` contact block in the site store, so
 * an address changed in the dashboard is on the page at the next load — the
 * first acceptance criterion. A row nobody has filled in is dropped rather than
 * printed as an empty heading; see `contactDetails()`.
 */
export function ContactDetails({ contact, loading = false }) {
  const rows = contactDetails(contact);

  if (loading && rows.length === 0) {
    return (
      <div role="status" aria-label="Loading contact details" aria-busy="true" className="flex flex-col gap-6">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="size-11 shrink-0 animate-pulse rounded-full bg-ground" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3.5 w-24 animate-pulse rounded bg-ground" />
              <div className="h-3.5 w-full animate-pulse rounded bg-ground" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Not `return null`. This card sits beside the form in a two-column layout,
  // and vanishing leaves an empty half — the blank panel §10.5 is about. The
  // form beneath still reaches us, so say that rather than showing nothing.
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-line p-5 text-sm leading-relaxed text-ink-muted">
        Our contact details could not be loaded just now. The form below still reaches us, and we
        reply to every message.
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {rows.map((row, index) => {
        const Glyph = ICONS[row.icon];

        return (
          <li
            key={row.key}
            className={`flex gap-4 ${index === 0 ? "" : "mt-5 border-t border-line pt-5"}`}
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-on-brand">
              <Glyph size={19} strokeWidth={1.75} aria-hidden="true" />
            </span>

            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-ink">{row.label}</h3>
              <div className="mt-1 space-y-0.5 text-sm leading-relaxed text-ink-muted">
                {/* Keyed by position, not by text: an editor who puts the same
                    number in both phone fields would otherwise collide. */}
                {row.lines.map((line, position) => (
                  <Line key={`${row.key}-${position}`} line={line} />
                ))}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
