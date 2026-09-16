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
 * **The payload carries no image dimensions** — only `url` and `alt` — so the
 * true heights are unknowable before each image loads. A grid that waits to
 * find out reflows every tile below it as they arrive, which is exactly the
 * layout shift criterion two forbids.
 *
 * So each tile reserves a ratio chosen from this set, and the image is cropped
 * to fill it. The rhythm reads as masonry, nothing moves, and the lightbox shows
 * the picture uncropped. If the API ever returns dimensions, this is the one
 * place that changes.
 */
const RATIOS = ["3 / 4", "1 / 1", "4 / 5", "1 / 1", "4 / 3", "3 / 4"];

/**
 * Deterministic per item, so the layout is identical on every render and after
 * a refetch — a random ratio would reshuffle the whole grid on each paint.
 */
export const ratioFor = (index) => RATIOS[index % RATIOS.length];

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
