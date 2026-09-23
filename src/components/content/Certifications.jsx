import { ShieldCheck } from "lucide-react";

import { CloudinaryImage } from "../CloudinaryImage.jsx";
import { cn } from "../../lib/cn.js";
import { SectionHeading } from "./SectionHeading.jsx";
import { SIZES } from "../../lib/cloudinary.js";

/**
 * The certifications row, on both About and Quality (§10.4).
 *
 * `logo_id` is nullable and every seeded row leaves it null — uploading the real
 * marks is the client's job under RTPP-86 — so a card without a logo has to look
 * deliberate rather than broken. It falls back to a shield, not to a blank box.
 *
 * `certificate_url` is likewise null on every row today. When a certificate
 * PDF is attached the card becomes a link to it; until then it is a plain card,
 * because a link to nothing is worse than no link.
 *
 * Note the name: the public endpoint sends `certificate_url` — a string — where
 * the admin schema has `certificate_file_id`. Reading the admin's name here
 * produced `undefined`, so the link would simply never have appeared, and only
 * once somebody uploaded a PDF and wondered where it went.
 */
function Certification({ certification }) {
  const { name, subtitle, logo, certificate_url: certificate } = certification;

  const card = (
    <>
      <span className="grid h-16 place-items-center">
        {logo?.url ? (
          <CloudinaryImage
            src={logo.url}
            alt=""
            width={logo.width}
            height={logo.height}
            sizes={SIZES.thumbnail}
            className="h-16 w-auto"
            imgClassName="object-contain"
          />
        ) : (
          <ShieldCheck size={40} strokeWidth={1.25} aria-hidden="true" className="text-brand" />
        )}
      </span>

      <span className="mt-3 block text-sm font-semibold text-ink">{name}</span>
      {subtitle ? <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">{subtitle}</span> : null}
    </>
  );

  return (
    <li className="rounded-xl border border-line bg-surface p-4 text-center">
      {certificate ? (
        <a
          href={certificate}
          target="_blank"
          rel="noreferrer noopener"
          className="block rounded-md hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {card}
          <span className="sr-only">— view certificate (opens in a new tab)</span>
        </a>
      ) : (
        card
      )}
    </li>
  );
}

/**
 * `aside` is the About comp's arrangement: the heading in a narrow column on
 * the left with the marks in a row beside it, rather than centred above them.
 * Quality keeps the centred version, so this is a prop rather than a rewrite.
 *
 * The split is 1fr/2fr — measured off the comp, the heading occupies about a
 * third of the content width and the five cards the rest.
 */
export function Certifications({
  items,
  block,
  eyebrow,
  heading,
  subheading,
  tone = "ground",
  aside = false,
  // Forwarded to `SectionHeading` — see the note there.
  headingClassName,
  // The Quality comp draws six marks in one row where the default tops out at
  // five. Opt-in, so About's row is the row it already was.
  columns,
}) {
  if (!items?.length) return null;

  return (
    <section
      aria-labelledby="certifications-heading"
      className={tone === "ground" ? "bg-ground py-(--space-section)" : "bg-surface py-(--space-section)"}
    >
      <div
        className={cn(
          "mx-auto max-w-(--container-max) pl-(--gutter-l) pr-(--gutter-r)",
          aside && "lg:grid lg:grid-cols-[1fr_2fr] lg:items-center lg:gap-12",
        )}
      >
        <SectionHeading
          block={block}
          id="certifications-heading"
          eyebrow={eyebrow}
          heading={heading}
          subheading={subheading}
          align={aside ? "start" : "center"}
          className={headingClassName}
        />

        {/* `[&>*]:min-w-0` for the reason every grid here carries it: a track
            is `min-width: auto`, so the longest certification name would
            otherwise set the column floor and push the row off-screen. */}
        <ul
          className={cn(
            "grid grid-cols-2 gap-4 sm:grid-cols-3 [&>*]:min-w-0",
            aside ? "mt-8 lg:mt-0" : "mt-10",
            columns ?? (aside ? "lg:grid-cols-5" : "lg:grid-cols-4 xl:grid-cols-5"),
          )}
        >
          {items.map((certification) => (
            <Certification key={certification.id} certification={certification} />
          ))}
        </ul>
      </div>
    </section>
  );
}
