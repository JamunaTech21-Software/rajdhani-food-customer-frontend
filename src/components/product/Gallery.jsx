import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { useState } from "react";

import { CloudinaryImage } from "../CloudinaryImage.jsx";
import { cn } from "../../lib/cn.js";
import { SIZES } from "../../lib/cloudinary.js";

/**
 * The product gallery (§10.2) — main image, thumbnail strip, arrows, lightbox.
 *
 * The thumbnails are `aria-pressed` buttons rather than a listbox: they change
 * what the main image shows, which is a set of toggles, not a form control with
 * a value. The main image is not itself a button — it opens the lightbox through
 * an explicit control, so that a visitor who only wants to look is not one
 * mis-tap away from a modal.
 */
export function Gallery({ images, alt, priority = false }) {
  const shots = images ?? [];
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  const current = shots[Math.min(index, Math.max(shots.length - 1, 0))] ?? null;
  const many = shots.length > 1;

  const step = (delta) => setIndex((i) => (i + delta + shots.length) % shots.length);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-xl border border-line bg-ground">
        <CloudinaryImage
          src={current?.url}
          alt={current?.alt ?? alt ?? ""}
          aspectRatio="1 / 1"
          sizes={SIZES.half}
          priority={priority}
          className="size-full"
          imgClassName="object-contain"
        />

        {current?.url ? (
          <button
            type="button"
            onClick={() => setZoomed(true)}
            aria-label="View larger image"
            className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-surface/90 text-ink shadow-card hover:bg-surface"
          >
            <Expand size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        ) : null}

        {many ? (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-surface/90 text-ink shadow-card hover:bg-surface"
            >
              <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next image"
              className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-surface/90 text-ink shadow-card hover:bg-surface"
            >
              <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>

      {many ? (
        <ul className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {shots.map((shot, i) => (
            <li key={shot.url ?? i}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-pressed={i === index}
                aria-label={`Show image ${i + 1} of ${shots.length}`}
                className={cn(
                  "block size-20 shrink-0 overflow-hidden rounded-lg border-2 bg-ground transition-colors duration-(--duration-fast)",
                  i === index ? "border-brand" : "border-line hover:border-line-strong",
                )}
              >
                <CloudinaryImage
                  src={shot.url}
                  alt=""
                  width={80}
                  height={80}
                  sizes={SIZES.thumbnail}
                  className="size-full"
                  imgClassName="object-contain"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <Dialog.Root open={zoomed} onOpenChange={setZoomed}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/80" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed left-1/2 top-1/2 z-50 w-[min(56rem,100vw-2rem)] -translate-x-1/2 -translate-y-1/2"
          >
            <Dialog.Title className="sr-only">{alt ?? "Product image"}</Dialog.Title>

            <div className="overflow-hidden rounded-xl bg-surface">
              <CloudinaryImage
                src={current?.url}
                alt={current?.alt ?? alt ?? ""}
                aspectRatio="1 / 1"
                sizes={SIZES.content}
                // Already on screen at a smaller size, so the browser is not
                // being asked to fetch this cold.
                priority
                className="size-full"
                imgClassName="object-contain"
              />
            </div>

            <Dialog.Close
              aria-label="Close image"
              className="absolute -top-12 right-0 grid size-10 place-items-center rounded-full bg-surface text-ink"
            >
              <X size={18} strokeWidth={2} aria-hidden="true" />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
