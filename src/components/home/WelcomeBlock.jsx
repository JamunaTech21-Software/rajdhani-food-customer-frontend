import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, CircleCheck, Play, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { CloudinaryImage } from "../CloudinaryImage.jsx";
import { SIZES } from "../../lib/cloudinary.js";
import { isDirectVideo, toEmbedUrl } from "../../lib/videoEmbed.js";
import { isExternal } from "../../lib/nav.js";

/**
 * The `HOME_VIDEO_CARD` promo, opening a video modal (§10.1).
 *
 * The iframe is only mounted while the dialog is open. A hidden YouTube frame
 * loads its player, sets cookies and runs scripts on every page view whether or
 * not anyone watches — which is both a performance cost on the critical path
 * and a tracker nobody consented to.
 */
function PromoCard({ banner }) {
  const [open, setOpen] = useState(false);
  const embed = toEmbedUrl(banner.video_url);
  const image = banner.desktop_image;

  // Nothing playable: a card promising a video that opens nothing is worse than
  // no card, so it falls back to whatever CTA the banner carries.
  if (!embed && !banner.video_url) return null;

  const trigger = (
    <span className="group relative block overflow-hidden rounded-xl bg-brand-deep">
      {image?.url ? (
        <CloudinaryImage
          src={image.url}
          alt={image.alt ?? ""}
          aspectRatio="16 / 9"
          sizes={SIZES.half}
          className="size-full opacity-80 transition-transform duration-(--duration-slow) group-hover:scale-105"
        />
      ) : (
        <span aria-hidden="true" className="block aspect-video" />
      )}

      <span className="absolute inset-0 grid place-items-center">
        <span className="grid size-16 place-items-center rounded-full bg-surface/90 text-brand shadow-modal transition-transform duration-(--duration-fast) group-hover:scale-110">
          <Play size={24} strokeWidth={2} fill="currentColor" aria-hidden="true" />
        </span>
      </span>

      {banner.title ? (
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent p-5">
          <span className="block font-display text-lg font-semibold text-ink-inverse">
            {banner.title}
          </span>
        </span>
      ) : null}
    </span>
  );

  // Unembeddable but present: open it where it does work rather than framing a
  // page that will refuse.
  if (!embed) {
    return (
      <a href={banner.video_url} target="_blank" rel="noopener noreferrer" className="block">
        <span className="sr-only">Play video (opens in a new tab)</span>
        {trigger}
      </a>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className="block w-full text-left">
          <span className="sr-only">Play video</span>
          {trigger}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/70" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 w-[min(60rem,100vw-2rem)] -translate-x-1/2 -translate-y-1/2"
        >
          <Dialog.Title className="sr-only">{banner.title ?? "Video"}</Dialog.Title>

          <div className="relative overflow-hidden rounded-xl bg-ink">
            {isDirectVideo(embed) ? (
              // No caption track: the admin stores a URL and nothing else, so
              // there is no subtitle file to point at. Worth raising if these
              // videos carry speech — an uncaptioned one is an AA failure.
              <video src={embed} controls autoPlay className="aspect-video w-full" />
            ) : (
              <iframe
                src={`${embed}?autoplay=1&rel=0`}
                title={banner.title ?? "Video"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                allowFullScreen
                className="aspect-video w-full border-0"
              />
            )}
          </div>

          <Dialog.Close
            aria-label="Close video"
            className="absolute -top-12 right-0 grid size-10 place-items-center rounded-full bg-surface text-ink"
          >
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * The welcome / about teaser (§10.1) — the published `(home, welcome)`
 * `PageBlock`, with its four-item benefit list and the promo card beside it.
 *
 * `body` is rich text the API has **already sanitised** server-side
 * (`RichText::sanitize()`), which is why it is set as HTML here. Sanitising
 * again on the client would be theatre: the server is the authority, and a
 * second pass in the browser protects nothing an attacker could not skip.
 */
export function WelcomeBlock({ block, promo }) {
  if (!block) return null;

  const promoBanner = promo?.[0] ?? null;
  const bullets = block.bullet_points ?? [];

  return (
    <section aria-labelledby="welcome-heading" className="py-16">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-14">
        <div>
          {block.eyebrow ? (
            <p className="text-eyebrow font-semibold uppercase tracking-[0.2em] text-brand">
              {block.eyebrow}
            </p>
          ) : null}

          {block.heading ? (
            <h2 id="welcome-heading" className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">
              {block.heading}
            </h2>
          ) : null}

          {block.subheading ? (
            <p className="mt-3 text-lg text-ink-muted">{block.subheading}</p>
          ) : null}

          {block.body ? (
            <div
              className="mt-4 max-w-prose text-base leading-relaxed text-ink-muted [&_a]:text-brand [&_a]:underline [&_p+p]:mt-3"
              dangerouslySetInnerHTML={{ __html: block.body }}
            />
          ) : null}

          {bullets.length ? (
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {bullets.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-ink">
                  <CircleCheck
                    size={18}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-brand"
                  />
                  {point}
                </li>
              ))}
            </ul>
          ) : null}

          {block.cta_label && block.cta_url ? (
            <div className="mt-8">
              {isExternal(block.cta_url) ? (
                <a
                  href={block.cta_url}
                  className="inline-flex h-12 items-center gap-2 rounded-md bg-brand px-6 text-sm font-medium text-on-brand hover:bg-brand-dark"
                >
                  {block.cta_label}
                  <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                </a>
              ) : (
                <Link
                  to={block.cta_url}
                  className="inline-flex h-12 items-center gap-2 rounded-md bg-brand px-6 text-sm font-medium text-on-brand transition-colors duration-(--duration-fast) hover:bg-brand-dark"
                >
                  {block.cta_label}
                  <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                </Link>
              )}
            </div>
          ) : null}
        </div>

        {promoBanner ? (
          <PromoCard banner={promoBanner} />
        ) : block.image?.url ? (
          <div className="overflow-hidden rounded-xl">
            <CloudinaryImage
              src={block.image.url}
              alt={block.image.alt ?? ""}
              aspectRatio="4 / 3"
              sizes={SIZES.half}
              className="size-full"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
