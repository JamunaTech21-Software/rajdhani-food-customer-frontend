/**
 * The reviews tab (§10.2, §9.4).
 *
 * Two acceptance criteria, and both come down to where a number comes from
 * rather than to how it is drawn.
 */

export const STARS = [5, 4, 3, 2, 1];

/**
 * The distribution bars, from the **server's** aggregate.
 *
 * This is the second criterion — *the distribution matches the approved reviews
 * shown* — and the way to fail it is to count the reviews on screen. The list
 * is paginated at twelve; the distribution covers every approved review the
 * product has. Counting the visible page would draw a chart of page one and
 * label it as the product's, and it would change as somebody paged.
 *
 * So the bars read `meta.distribution` and the total reads `meta.rating_count`,
 * which the API computes over the same approved set. The two cannot disagree
 * because only one of them is ours.
 */
export function distributionRows(meta) {
  const counts = meta?.distribution ?? {};
  const total = Number(meta?.rating_count) || 0;

  return STARS.map((stars) => {
    const count = Number(counts[stars] ?? counts[String(stars)]) || 0;

    return {
      stars,
      count,
      // Zero rather than NaN for a product with no reviews, which is every
      // product in this catalogue today.
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });
}

/** The average, to one place, or null when there is nothing to average. */
export function averageRating(meta) {
  const count = Number(meta?.rating_count) || 0;
  if (count <= 0) return null;

  const average = Number(meta?.rating_average);
  return Number.isFinite(average) ? Math.round(average * 10) / 10 : null;
}

/*
 * Everything below this point went with the review form: the zod schema, the
 * empty defaults, the request body, and the two helpers that decided whether
 * to offer a write, an edit or a sign-in prompt. Reviews are written and
 * approved in the admin panel now and arrive here already public, so the only
 * thing this module still does is turn the list meta into the bars beside it.
 */
