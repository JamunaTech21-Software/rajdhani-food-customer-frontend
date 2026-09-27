import { CloudinaryImage } from "../CloudinaryImage.jsx";
import { RichText } from "../content/RichText.jsx";
import { SIZES } from "../../lib/cloudinary.js";
import { cn } from "../../lib/cn.js";

/**
 * "Let's Build a Strong Future" — the small card beside the application form.
 *
 * Heading, a line of copy, and the handshake photograph under them. The image
 * is the block's own: `build_future` already declares one in the admin's Page
 * content catalogue, so it is an upload rather than an asset in this bundle.
 *
 * The photograph is `alt=""`: it illustrates the sentence above it and says
 * nothing a reader would otherwise miss, and "two people shaking hands" read
 * aloud after the copy is noise rather than information.
 */
export function BuildFutureCard({ block, className }) {
  if (!block) return null;

  return (
    <aside
      aria-labelledby={block.heading ? "dealer-future-heading" : undefined}
      className={cn("flex h-full flex-col overflow-hidden rounded-xl bg-ground-warm", className)}
    >
      <div className="p-5 sm:p-6">
        {block.heading ? (
          <h2
            id="dealer-future-heading"
            className="font-display text-lg font-bold leading-snug text-brand sm:text-xl"
          >
            {block.heading}
          </h2>
        ) : null}

        <RichText html={block.body} className="mt-3 text-sm" />
      </div>

      {block.image?.url ? (
        // The ratio lives on the wrapper, not on the image: `aspectRatio` is an
        // inline style and cannot change at a breakpoint, and this card is a
        // wide banner on a phone and a tall column at `xl`.
        <div className="mt-auto aspect-[16/9] w-full xl:aspect-[7/6]">
          <CloudinaryImage
            src={block.image.url}
            alt=""
            sizes={SIZES.half}
            className="size-full"
          />
        </div>
      ) : null}
    </aside>
  );
}
