/**
 * Gallery logic (§10.4) — tabs, masonry rhythm and lightbox navigation.
 *
 * Pure, because the two acceptance criteria turn on things that are awkward to
 * check by clicking: that every keyboard move round the lightbox lands where it
 * should, and that every tile reserves its space before the image arrives.
 */

export const ALL_CATEGORY = { slug: null, name: "All", icon_name: "image" };

/**
 * The tab bar: All, then each category.
 *
 * **Empty categories are kept.** `Events` currently has `image_count: 0`, and
 * hiding it would mean a category an editor created is invisible to them until
 * they upload — the same rule the product filter bar follows. The count is shown
 * so the tab is honest about being empty rather than looking broken when clicked.
 */
export function galleryTabs(categories) {
  return [
    ALL_CATEGORY,
    ...(categories ?? [])
      .filter((category) => category?.slug)
      .map((category) => ({
        slug: category.slug,
        name: category.name,
        icon_name: category.icon_name ?? null,
        count: category.image_count ?? 0,
      })),
  ];
}

/**
 * Aspect ratios for the masonry tiles.
 *
 * **Real dimensions are used when the payload has them.** It now carries
 * `width` and `height` (added 2026-09-16), so each tile reserves the shape the
 * image actually is — nothing is cropped and nothing moves when it loads.
 *
 * The cycling fallback below is kept for anything still without them: the site
 * logo has no dimensions, and older rows may not. A grid that waits to discover
 * a height reflows every tile beneath it as images arrive, which is exactly the
 * layout shift criterion two forbids — so there must always be *some* reserved
 * ratio, even a guessed one.
 */
const FALLBACK_RATIOS = ["3 / 4", "1 / 1", "4 / 5", "1 / 1", "4 / 3", "3 / 4"];

/**
 * The fallback is deterministic per index, so the layout is identical on every
 * render and after a refetch — a random ratio would reshuffle the whole grid on
 * each paint, creating the shift by itself.
 */
export function ratioFor(index, image) {
  const { width, height } = image?.image ?? image ?? {};

  // Guard against zero and nonsense as well as absence: a height of 0 would
  // produce `aspect-ratio: 1200 / 0`, which collapses the tile to nothing.
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return `${width} / ${height}`;
  }

  return FALLBACK_RATIOS[index % FALLBACK_RATIOS.length];
}

/**
 * Where a keyboard move lands in the lightbox.
 *
 * Wraps at both ends: from the last image, Right goes to the first. A dead
 * arrow key at the end of a gallery reads as a broken control rather than as an
 * edge, and there is nothing else for the key to mean here.
 */
export function nextIndex(current, total, key) {
  if (!Number.isInteger(total) || total <= 0) return 0;

  const at = Number.isInteger(current) ? current : 0;

  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return (at + 1) % total;
    case "ArrowLeft":
    case "ArrowUp":
      return (at - 1 + total) % total;
    case "Home":
      return 0;
    case "End":
      return total - 1;
    default:
      return at;
  }
}

/** Whether a key means anything to the lightbox, so the rest pass through. */
export const isNavigationKey = (key) =>
  ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End"].includes(key);

/** The caption shown on hover and read in the lightbox. */
export const captionFor = (image) =>
  image?.title || image?.image?.alt || image?.category?.name || "Gallery image";
