import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect } from "react";

import { CloudinaryImage } from "../CloudinaryImage.jsx";
import { SIZES } from "../../lib/cloudinary.js";
import { captionFor, isNavigationKey, nextIndex } from "../../lib/gallery.js";

/**
 * The gallery lightbox (§10.4).
 *
 * RTPP-64's first criterion is that this is **fully operable by keyboard
 * alone**, which is three separate things:
 *
 *   **Getting in and out.** Each tile is a real button, so Tab reaches it and
 *   Enter opens it. Radix returns focus to that exact tile on close, so a
 *   keyboard user resumes where they were rather than at the top of the page.
 *
 *   **Moving between images.** Arrows, Home and End, handled on the dialog
 *   rather than on a focused control — a visitor should not have to find the
 *   Next button before the arrow keys do anything.
 *
 *   **Escape and focus trapping**, which Radix provides.
 *
 * The listener is on the document rather than the content element because focus
 * may legitimately sit on the close button or either arrow, and the keys must
 * work from all of them.
 */
export function Lightbox({ images, index, onIndexChange, onClose }) {
  const total = images?.length ?? 0;
  const open = index !== null && index >= 0 && total > 0;

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (!isNavigationKey(event.key)) return;
      // Stops Home/End and the arrows scrolling the page behind the dialog.
      event.preventDefault();
      onIndexChange(nextIndex(index, total, event.key));
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, index, total, onIndexChange]);

  if (!open) return null;

  const image = images[index];
  const caption = captionFor(image);

  return (
    <Dialog.Root open onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/90" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center pt-4 sm:pt-8 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-[max(2rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] sm:pl-[max(2rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:pr-[max(2rem,env(safe-area-inset-right))]"
        >
          <Dialog.Title className="sr-only">{caption}</Dialog.Title>

          {/* Announced on change, so a screen-reader user knows they moved and
              where they are — the visual position indicator is not enough. */}
          <p aria-live="polite" className="sr-only">
            Image {index + 1} of {total}: {caption}
          </p>

          {/*
            The media area flexes and the caption row does not.

            A fixed 3:2 box `w-full` inside this column was 405px tall on a
            640px-wide screen — half again as tall as a landscape phone, with
            the caption below that. Letting the image take whatever height is
            left and `object-contain` inside it means the picture is always as
            large as fits and never larger. `min-h-0` is what allows a flex
            child to shrink below its content at all.

            No background on the box any more: letterboxing against the
            overlay's own dark ground is invisible, where a black panel around a
            portrait image is not.
          */}
          <div className="relative flex h-full w-full max-w-5xl flex-col">
            <div className="min-h-0 flex-1">
              <CloudinaryImage
                src={image?.image?.url}
                alt={image?.image?.alt ?? caption}
                sizes={SIZES.lightbox}
                priority
                className="size-full"
                imgClassName="object-contain"
              />
            </div>

            <div className="mt-4 flex shrink-0 items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink-inverse">{caption}</p>
                {image?.category?.name ? (
                  <p className="text-sm text-ink-inverse/70">{image.category.name}</p>
                ) : null}
              </div>

              <p className="shrink-0 text-sm tabular-nums text-ink-inverse/70">
                {index + 1} / {total}
              </p>
            </div>
          </div>

          {total > 1 ? (
            <>
              <button
                type="button"
                onClick={() => onIndexChange(nextIndex(index, total, "ArrowLeft"))}
                aria-label="Previous image"
                className="absolute left-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-surface/90 text-ink hover:bg-surface sm:left-6"
              >
                <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onIndexChange(nextIndex(index, total, "ArrowRight"))}
                aria-label="Next image"
                className="absolute right-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-surface/90 text-ink hover:bg-surface sm:right-6"
              >
                <ChevronRight size={20} strokeWidth={2} aria-hidden="true" />
              </button>
            </>
          ) : null}

          <Dialog.Close
            aria-label="Close gallery"
            className="absolute right-3 top-3 grid size-11 place-items-center rounded-full bg-surface/90 text-ink hover:bg-surface sm:right-6 sm:top-6"
          >
            <X size={20} strokeWidth={2} aria-hidden="true" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
