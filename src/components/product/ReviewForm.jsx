import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { useState } from "react";

import { ApiError, ErrorCode } from "@shared/api/errors.js";

import { StarInput } from "./StarInput.jsx";
import { accountApi } from "../../lib/api.js";
import { cn } from "../../lib/cn.js";
import { EMPTY_REVIEW, reviewSchema, toReviewPayload } from "../../lib/reviews.js";
import { useRecaptcha } from "../../hooks/useRecaptcha.js";

/**
 * Write or edit a review (§10.2, §9.4).
 *
 * **A submitted review never joins the list on screen.** That is the first
 * acceptance criterion, and the way to break it is the obvious one: optimistic
 * insertion. The API always creates a `PENDING` review and the list endpoint
 * returns approved ones only, so showing it would be the front-end asserting
 * something the server does not agree with — and it would vanish on the next
 * load. The form says what happened instead.
 *
 * Editing works the same way: `PATCH` resets the status to `PENDING`
 * unconditionally, so an approved review disappears from the public list the
 * moment it is edited. The confirmation says so, because otherwise a customer
 * fixing a typo sees their review vanish and assumes it was removed.
 */
export function ReviewForm({ slug, ownReview, onSaved }) {
  const [done, setDone] = useState(null);
  const getRecaptchaToken = useRecaptcha("review");
  const editing = Boolean(ownReview?.id);

  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(reviewSchema),
    defaultValues: editing
      ? { rating: ownReview.rating, title: ownReview.title ?? "", comment: ownReview.comment ?? "" }
      : EMPTY_REVIEW,
  });

  const { mutateAsync } = useMutation({
    mutationFn: async (values) => {
      const recaptchaToken = await getRecaptchaToken();
      const body = toReviewPayload(values, { recaptchaToken });

      // The edit endpoint takes neither the honeypot nor a token — it is not
      // one of §14.2's five forms, and sending them would be noise.
      return editing
        ? accountApi.patch(`/public/my/reviews/${encodeURIComponent(ownReview.id)}`, {
            rating: body.rating,
            title: body.title ?? null,
            comment: body.comment,
          })
        : accountApi.post(`/public/products/${encodeURIComponent(slug)}/reviews`, body);
    },
    onSuccess: (review) => {
      setDone(editing ? "edited" : "submitted");
      onSaved?.(review);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === ErrorCode.VALIDATION_ERROR) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field, { type: "server", message });
        }
        return;
      }
      if (error instanceof ApiError && error.code === ErrorCode.CONFLICT) {
        // One review per customer per product. Reaching this means the tab did
        // not know about an existing one — a review written in another tab.
        setError("root", {
          message: "You have already reviewed this product. Reload the page to edit that review.",
        });
        return;
      }
      if (error instanceof ApiError && error.code === ErrorCode.RATE_LIMITED) {
        setError("root", { message: "You have submitted a review recently. Please try again later." });
        return;
      }
      setError("root", { message: "We could not save that just now. Please try again." });
    },
  });

  if (done) {
    return (
      <div role="status" className="rounded-xl bg-brand-tint p-5">
        <p className="font-medium text-ink">
          {done === "edited" ? "Your review has been updated" : "Thank you for your review"}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          {done === "edited"
            ? "Edited reviews go back to our team for approval, so it will not be on this page until it is checked again."
            : "Our team reads every review before it appears here, so it will not show up straight away."}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((values) => mutateAsync(values).catch(() => {}))}
      noValidate
      className="flex flex-col gap-4 rounded-xl border border-line p-5"
    >
      {/* Honeypot: off-screen rather than display:none, out of the tab order
          and out of the accessibility tree. */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="review-website">Website</label>
        <input id="review-website" type="text" tabIndex={-1} autoComplete="off" name="website" defaultValue="" />
      </div>

      <Controller
        control={control}
        name="rating"
        render={({ field }) => (
          <StarInput value={field.value} onChange={field.onChange} error={errors.rating?.message} />
        )}
      />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Title (optional)</span>
        <input
          className={cn(
            "h-11 scroll-mt-(--scroll-offset) rounded-md border bg-surface px-3 text-sm text-ink",
            errors.title ? "border-danger" : "border-line",
          )}
          {...register("title")}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">
          Your review
          <span className="ml-0.5 text-danger" aria-hidden="true">*</span>
        </span>
        <textarea
          rows={4}
          aria-invalid={errors.comment ? true : undefined}
          className={cn(
            "scroll-mt-(--scroll-offset) rounded-md border bg-surface px-3 py-2.5 text-sm text-ink",
            errors.comment ? "border-danger" : "border-line",
          )}
          {...register("comment")}
        />
        {errors.comment ? (
          <span role="alert" className="text-sm text-danger">
            {errors.comment.message}
          </span>
        ) : null}
      </label>

      {errors.root ? (
        <p role="alert" className="rounded-md bg-danger-tint p-3 text-sm text-danger">
          {errors.root.message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-11 items-center rounded-md bg-brand px-5 text-sm font-medium text-on-brand transition-colors duration-(--duration-fast) hover:bg-brand-dark disabled:opacity-60"
        >
          {isSubmitting ? "Sending…" : editing ? "Update review" : "Submit review"}
        </button>

        <p className="text-sm text-ink-subtle">
          Reviews are checked by our team before they appear.
        </p>
      </div>
    </form>
  );
}
