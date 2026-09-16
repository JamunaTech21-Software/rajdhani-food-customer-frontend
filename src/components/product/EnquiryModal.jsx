import * as Dialog from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { CircleCheck, Copy, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { ApiError, ErrorCode } from "@shared/api/errors.js";

import { cn } from "../../lib/cn.js";
import { enquirySchema, initialEnquiryValues, toEnquiryPayload } from "../../lib/enquiry.js";
import { publicApi } from "../../lib/api.js";
import { useRecaptcha } from "../../hooks/useRecaptcha.js";

function Field({ label, error, required, hint, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">
        {label}
        {required ? <span className="ml-0.5 text-danger" aria-hidden="true">*</span> : null}
      </span>
      {children}
      {error ? (
        <span role="alert" className="text-sm text-danger">
          {error}
        </span>
      ) : hint ? (
        <span className="text-sm text-ink-muted">{hint}</span>
      ) : null}
    </label>
  );
}

const inputClass = (invalid) =>
  cn(
    "h-11 rounded-md border bg-surface px-3 text-sm text-ink",
    invalid ? "border-danger" : "border-line",
  );

/**
 * The product enquiry modal (§10.2) — the platform's primary conversion path.
 *
 * There is no cart and no checkout, so this form *is* the transaction. It gets
 * the care a checkout would: validation that matches the API's own rules so a
 * mistake is caught before a round trip, a reference number on success, and a
 * failure that never loses what someone typed.
 *
 * Remounted per open via a `key` on the caller, so the form resets without an
 * effect and never shows the previous product's values for a frame.
 */
export function EnquiryModal({ open, onOpenChange, product, pack, quantity, customer }) {
  const [reference, setReference] = useState(null);
  const getRecaptchaToken = useRecaptcha("enquiry");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(enquirySchema),
    defaultValues: initialEnquiryValues({ pack, quantity, customer }),
  });

  const { mutateAsync } = useMutation({
    mutationFn: async (values) => {
      const recaptchaToken = await getRecaptchaToken();

      return publicApi.post(
        "/public/enquiries",
        toEnquiryPayload(values, {
          productId: product?.id,
          sourcePage: typeof window === "undefined" ? undefined : window.location.pathname,
          recaptchaToken,
        }),
      );
    },
    onSuccess: (result) => setReference(result?.referenceNo ?? null),
    onError: (error) => {
      if (error instanceof ApiError && error.code === ErrorCode.VALIDATION_ERROR) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field, { type: "server", message });
        }
        return;
      }

      // Rate limiting is 5 per hour per IP. Saying so is far better than a
      // generic failure, because the visitor can act on it.
      if (error instanceof ApiError && error.code === ErrorCode.RATE_LIMITED) {
        setError("root", {
          message: "You have sent several enquiries recently. Please try again in a little while.",
        });
        return;
      }

      setError("root", {
        message: "We could not send that just now. Please try again, or call us instead.",
      });
    },
  });

  function close(next) {
    onOpenChange(next);
    // Cleared only after the dialog is gone, so the success panel does not flash
    // back to the form on the way out.
    if (!next) setTimeout(() => setReference(null), 200);
  }

  return (
    <Dialog.Root open={open} onOpenChange={close}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/50" />
        {/* Radix handles the three focus requirements: trapped while open,
            Escape closes, and focus returns to the trigger on close. */}
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92dvh] w-[min(38rem,100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-surface shadow-modal">
          <div className="flex items-start justify-between gap-4 border-b border-line p-5">
            <div>
              <Dialog.Title className="font-display text-lg font-semibold text-ink">
                {reference ? "Enquiry received" : "Enquire about this product"}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-ink-muted">
                {reference
                  ? "Our sales team will be in touch shortly."
                  : product?.name ?? "Tell us what you need and we will get back to you."}
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="grid size-9 shrink-0 place-items-center rounded-md text-ink-subtle hover:bg-ground hover:text-ink"
            >
              <X size={18} strokeWidth={1.75} aria-hidden="true" />
            </Dialog.Close>
          </div>

          {reference ? (
            <div className="p-6 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-success-tint text-success">
                <CircleCheck size={28} strokeWidth={1.75} aria-hidden="true" />
              </span>

              <p className="mt-4 text-ink">Thank you. Your enquiry reference is</p>

              <p className="mt-2 font-mono text-xl font-semibold text-brand">{reference}</p>

              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(reference).catch(() => {})}
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-brand"
              >
                <Copy size={14} strokeWidth={1.75} aria-hidden="true" />
                Copy reference
              </button>

              <p className="mt-4 text-sm text-ink-muted">
                Keep this to hand — quoting it helps us find your enquiry quickly.
              </p>

              <button
                type="button"
                onClick={() => close(false)}
                className="mt-6 inline-flex h-11 items-center rounded-md bg-brand px-6 text-sm font-medium text-on-brand"
              >
                Done
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit((values) => mutateAsync(values).catch(() => {}))}
              noValidate
              className="flex flex-col gap-4 p-5"
            >
              {/*
                The honeypot. Off-screen rather than `display: none` — some bots
                skip hidden fields — and removed from the tab order and the
                accessibility tree so no real visitor can reach or hear it.
                The API refuses a filled one outright.
              */}
              <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
                <label htmlFor="website">Website</label>
                <input id="website" type="text" tabIndex={-1} autoComplete="off" name="website" defaultValue="" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Your name" required error={errors.name?.message}>
                  <input autoComplete="name" className={inputClass(errors.name)} {...register("name")} />
                </Field>

                <Field label="Company or shop" error={errors.company_name?.message}>
                  <input autoComplete="organization" className={inputClass(errors.company_name)} {...register("company_name")} />
                </Field>

                <Field label="Phone" required error={errors.phone?.message}>
                  <input type="tel" autoComplete="tel" className={inputClass(errors.phone)} {...register("phone")} />
                </Field>

                <Field label="Email" required error={errors.email?.message}>
                  <input type="email" autoComplete="email" className={inputClass(errors.email)} {...register("email")} />
                </Field>

                <Field label="City" required error={errors.city?.message}>
                  <input autoComplete="address-level2" className={inputClass(errors.city)} {...register("city")} />
                </Field>

                <Field label="Pack size" error={errors.pack_size_label?.message}>
                  <input className={inputClass(errors.pack_size_label)} {...register("pack_size_label")} />
                </Field>
              </div>

              <Field
                label="Quantity"
                hint="However you buy — for example 50 kg, or 10 cartons."
                error={errors.quantity?.message}
              >
                <input className={inputClass(errors.quantity)} {...register("quantity")} />
              </Field>

              <Field label="Your message" required error={errors.message?.message}>
                <textarea
                  rows={4}
                  className={cn(
                    "rounded-md border bg-surface px-3 py-2.5 text-sm text-ink",
                    errors.message ? "border-danger" : "border-line",
                  )}
                  {...register("message")}
                />
              </Field>

              {errors.root ? (
                <p role="alert" className="rounded-md bg-danger-tint p-3 text-sm text-danger">
                  {errors.root.message}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-1 inline-flex h-12 items-center justify-center rounded-md bg-brand px-6 text-sm font-medium text-on-brand transition-colors duration-(--duration-fast) hover:bg-brand-dark disabled:opacity-60"
              >
                {isSubmitting ? "Sending…" : "Send enquiry"}
              </button>

              <p className="text-center text-xs text-ink-subtle">
                We reply by phone or email. Your details are never shared.
              </p>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
