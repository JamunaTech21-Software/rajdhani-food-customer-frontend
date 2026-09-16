import { cn } from "../lib/cn.js";
import { cloudinaryUrl, SIZES, srcSet } from "../lib/cloudinary.js";

/**
 * The site's one image element (§12, §1578).
 *
 * `next/image` is gone with the Vite move (§19 deviation 2), so the three things
 * it did for free are done here:
 *
 *   **Format.** `f_auto,q_auto` on every URL, so Cloudinary serves AVIF or WebP
 *   by content negotiation rather than the page guessing.
 *
 *   **Layout stability.** `aspectRatio` reserves the box before the bytes
 *   arrive. Without it every image on the page shifts its neighbours when it
 *   loads, which is most of a bad CLS score.
 *
 *   **Priority.** Below-the-fold images lazy-load; the one LCP image per page
 *   is marked `priority`, which makes it eager and high-fetchPriority. Lazy
 *   would actively *delay* it — the browser defers the request until layout
 *   proves it is visible, and that is the metric being measured.
 *
 * `alt` is required rather than optional. A decorative image passes `alt=""`
 * explicitly, which is a decision; a missing attribute is an oversight, and the
 * two must not look the same.
 */
export function CloudinaryImage({
  src,
  alt,
  width,
  height,
  aspectRatio,
  sizes = SIZES.content,
  priority = false,
  widths,
  className,
  imgClassName,
  ...props
}) {
  if (!src) {
    // A reserved empty box, not a broken-image icon: the surrounding layout
    // should not jump just because one asset is missing.
    return (
      <span
        aria-hidden="true"
        className={cn("block bg-ground", className)}
        style={{ aspectRatio: aspectRatio ?? (width && height ? `${width} / ${height}` : undefined) }}
      />
    );
  }

  const set = srcSet(src, widths);

  return (
    <img
      src={cloudinaryUrl(src, { width: width ?? 1440 })}
      // Omitted entirely rather than set to null when there are no variants —
      // a srcSet of one width tells the browser it has no choice to make.
      {...(set ? { srcSet: set, sizes } : {})}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      // `high` only on the LCP image. Marking everything high is the same as
      // marking nothing: the browser has no ordering left to act on.
      fetchPriority={priority ? "high" : "auto"}
      decoding={priority ? "sync" : "async"}
      // `className` is merged here, not dropped. It used to apply only to the
      // no-src placeholder, so a caller sizing the image with `size-10` got
      // silently ignored and `w-full` filled whatever flex parent it landed in
      // — a 40px logo rendered 700px tall. tailwind-merge resolves the defaults
      // against whatever the caller passes, so `size-10` beats `h-full w-full`
      // and `object-contain` beats `object-cover`.
      className={cn("block h-full w-full object-cover", className, imgClassName)}
      style={{ aspectRatio: aspectRatio ?? (width && height ? `${width} / ${height}` : undefined) }}
      {...props}
    />
  );
}
