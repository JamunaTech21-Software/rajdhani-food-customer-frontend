import { z } from "zod";

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

/**
 * The form.
 *
 * Transcribed from `ReviewInput`, lengths included. `rating` is a *number* and
 * the star input must send one: a `"4"` from a radio group's value is a 422,
 * and it is the kind of thing that only shows up once someone submits.
 */
export const reviewSchema = z.object({
  rating: z
    .number({ message: "Please choose a rating" })
    .int()
    .min(1, "Please choose a rating")
    .max(5),
  title: z.string().trim().max(255).optional(),
  comment: z.string().trim().min(1, "Please tell us what you thought").max(5000),
});

export const EMPTY_REVIEW = { rating: 0, title: "", comment: "" };

/**
 * The request body.
 *
 * `website` is the honeypot and `recaptcha_token` the v3 token — §14.2 lists
 * "review" alongside the four anonymous forms, *even though this one also
 * requires a customer token*. Neither field is in `ReviewInput`, because that
 * schema is shared with the edit endpoint, which has neither.
 */
export function toReviewPayload(values, { recaptchaToken } = {}) {
  const title = values.title?.trim();

  return {
    rating: Number(values.rating),
    title: title ? title : undefined,
    comment: values.comment.trim(),
    recaptcha_token: recaptchaToken || undefined,
    website: "",
  };
}

/**
 * The customer's own review of this product, if they have one.
 *
 * `/public/my/reviews` returns every status, so this is how the tab knows to
 * offer an edit rather than a second submission — a second POST is a 409,
 * and finding that out by submitting is a poor way to learn it.
 */
export function ownReviewFor(reviews, productId) {
  if (!Array.isArray(reviews) || !productId) return null;
  return reviews.find((review) => review?.product?.id === productId) ?? null;
}

/**
 * What the tab should offer, given who is looking.
 *
 * Kept here rather than in the component because the four cases are the whole
 * of the feature's behaviour, and a component is a poor place to have to read
 * them from.
 */
export function submissionState({ session, ownReview }) {
  if (session === "unknown") return "checking";
  if (session !== "authenticated") return "sign-in";
  if (ownReview) return ownReview.status === "PENDING" ? "pending" : "edit";
  return "write";
}
