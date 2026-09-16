import { CloudinaryImage } from "../CloudinaryImage.jsx";
import { SIZES } from "../../lib/cloudinary.js";
import { captionFor, ratioFor } from "../../lib/gallery.js";

/**
 * The masonry grid (§10.4).
 *
 * CSS `columns` rather than a grid or a JS layout library: the tiles only have
 * to flow into balanced columns, and a column layout does that natively at every
 * width with no measuring and no resize listener.
 *
 * **Each tile reserves its height before its image loads.** The payload has no
 * dimensions, so the ratio comes from `ratioFor(index)` — deterministic, so the
 * layout is identical on every render. That is what satisfies "lazy-load without
 * layout shift": the boxes are laid out first and the images drop into them.
 */
export function GalleryGrid({ images, onOpen }) {
  if (!images?.length) return null;

  return (
    <ul className="columns-2 gap-4 sm:columns-2 lg:columns-3 xl:columns-4 [&>li]:mb-4">
      {images.map((image, index) => {
        const caption = captionFor(image);

        return (
          // break-inside-avoid stops a column break slicing a tile in half.
          <li key={image.id} className="break-inside-avoid">
            <button
              type="button"
              onClick={() => onOpen(index)}
              // A real button, so Tab reaches it and Enter opens the lightbox —
              // half of "operable by keyboard alone" is getting in.
              className="group relative block w-full overflow-hidden rounded-lg bg-ground"
            >
              <span className="sr-only">View {caption}</span>

              <CloudinaryImage
                src={image.image?.url}
                alt={image.image?.alt ?? ""}
                aspectRatio={ratioFor(index)}
                sizes={SIZES.card}
                // The first few are above the fold on a wide screen; the rest
                // stay lazy, which is the other half of criterion two.
                priority={index < 4}
                className="size-full transition-transform duration-(--duration-slow) group-hover:scale-105"
              />

              {/* Caption on hover, and on focus — otherwise it is invisible to
                  anyone navigating by keyboard. */}
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 to-transparent p-3 pt-8 text-left text-sm font-medium text-ink-inverse opacity-0 transition-opacity duration-(--duration-fast) group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                {caption}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
