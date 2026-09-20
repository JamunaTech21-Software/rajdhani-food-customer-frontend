import * as Dialog from "@radix-ui/react-dialog";
import { Play, X } from "lucide-react";
import { useState } from "react";

import { CloudinaryImage } from "../CloudinaryImage.jsx";
import { PageBlockBody } from "../content/PageBlockSection.jsx";
import { SIZES } from "../../lib/cloudinary.js";
import { isDirectVideo, toEmbedUrl } from "../../lib/videoEmbed.js";

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
          /*
            Width is limited by the *height* budget as well: a 16:9 box 608px
            wide is 342px tall, which does not fit a 640×360 phone held
            sideways. Multiplying the space available vertically by the aspect
            ratio gives the widest the box can be and still fit.
          */
          className="fixed left-1/2 top-1/2 z-50 w-[min(60rem,calc((100dvh-2rem)*16/9))] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2"
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
            /* Inside the frame, not floating 48px above it: on a short
               viewport there is no room above, and the control that closes a
               dialog is the last one that may be off-screen. */
            className="absolute right-2 top-2 grid size-11 place-items-center rounded-full bg-ink/70 text-ink-inverse backdrop-blur-sm hover:bg-ink/90"
          >
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * **Not rendered anywhere as of H5 (2026-09-20).**
 *
 * The reference draws the `(home, welcome)` block with the four counters
 * beside it, which is `AboutBand`, so that took this band's place on the home
 * page. What has no home any more is the `PromoCard` above: the reference has
 * no video anywhere on the page, and `HOME_VIDEO_CARD` is a placement the
 * admin still offers.
 *
 * Kept rather than deleted because **that is `homepage-plan.md`'s open
 * decision D5**, and it is the client's, not ours — deleting the only consumer
 * of a scheduled banner placement while the question is unanswered would
 * answer it by default. If the client wants the video somewhere, `PromoCard`
 * is what goes there; if they do not, this file and the placement go together.
 *
 * ---
 *
 * The welcome / about teaser (§10.1) — the published `(home, welcome)`
 * `PageBlock`, with its four-item benefit list and the promo card beside it.
 *
 * The text column is `PageBlockBody`, shared with the About and Quality pages:
 * all three render the same `PageBlock` payload, and two renderers for one
 * shape is how the two drift. What stays here is what is particular to the home
 * page — the promo card that takes the image column when one is scheduled.
 */
export function WelcomeBlock({ block, promo }) {
  if (!block) return null;

  const promoBanner = promo?.[0] ?? null;

  return (
    <section aria-labelledby="welcome-heading" className="py-(--space-section)">
      <div className="mx-auto grid max-w-(--container-max) gap-10 pl-(--gutter-l) pr-(--gutter-r) lg:grid-cols-2 lg:items-center lg:gap-14">
        <PageBlockBody block={block} headingId="welcome-heading" />

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
