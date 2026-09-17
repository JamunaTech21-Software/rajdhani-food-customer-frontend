import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Building2, CheckCircle2, Mail, MessageSquare, Phone, Send, User } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { ApiError, ErrorCode } from "@shared/api/errors.js";

import { publicApi } from "../../lib/api.js";
import { cn } from "../../lib/cn.js";
import { contactSchema, EMPTY_CONTACT, toContactPayload } from "../../lib/contact.js";
import { useRecaptcha } from "../../hooks/useRecaptcha.js";

/**
 * The comps put a glyph inside each control and no label above it.
 *
 * A placeholder is not a label: it disappears the moment someone types, and a
 * screen reader gets either nothing or the hint. So the comp's look is kept and
 * a real `<label>` is attached, visually hidden. Same markup contract as a
 * visible label — `htmlFor`, `id`, `aria-invalid`, `aria-describedby` — with the
 * name announced rather than drawn.
 */
function Field({ id, label, icon: Glyph, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>

      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-3.5 text-ink-subtle">
          <Glyph size={17} strokeWidth={1.75} aria-hidden="true" />
        </span>
        {children}
      </div>

      {error ? (
        <span id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </span>
      ) : null}
    </div>
  );
}

const controlClass = (invalid) =>
  cn(
    "w-full rounded-md border bg-surface pl-11 pr-3.5 text-sm text-ink placeholder:text-ink-subtle",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
    invalid ? "border-danger" : "border-line",
  );

const described = (id, error) => ({
  "aria-invalid": error ? true : undefined,
  "aria-describedby": error ? `${id}-error` : undefined,
});

/**
 * "Send Us a Message" (§10.4) — `POST /public/contact`.
 *
 * The simplest of the platform's four public forms: no reference number, no
 * assignee, three required fields. It still carries the same two defences as the
 * others (§14.2) — the honeypot below and a reCAPTCHA v3 token when a site key
 * is configured — because the API applies them here too. The live endpoint
 * answers a filled honeypot with 403 FORBIDDEN rather than a field error, which
 * is why that case is handled as a root message.
 */
export function ContactForm() {
  const [sent, setSent] = useState(false);
  const getRecaptchaToken = useRecaptcha("contact");

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(contactSchema), defaultValues: EMPTY_CONTACT });

  const { mutateAsync } = useMutation({
    mutationFn: async (values) => {
      const recaptchaToken = await getRecaptchaToken();
      return publicApi.post("/public/contact", toContactPayload(values, { recaptchaToken }));
    },
    onSuccess: () => {
      setSent(true);
      reset(EMPTY_CONTACT);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === ErrorCode.VALIDATION_ERROR) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field, { type: "server", message });
        }
        return;
      }
      if (error instanceof ApiError && error.code === ErrorCode.RATE_LIMITED) {
        setError("root", {
          message: "You have sent us a message recently. Please try again a little later, or call us instead.",
        });
        return;
      }
      setError("root", {
        message: "We could not send that just now. Please try again, or reach us on the numbers beside this form.",
      });
    },
  });

  if (sent) {
    return (
      <div role="status" className="flex flex-col items-start gap-3 rounded-xl bg-brand-tint p-6">
        <CheckCircle2 size={28} strokeWidth={1.75} aria-hidden="true" className="text-brand" />
        <div>
          <p className="font-display text-lg font-semibold text-ink">Thank you — your message is with us</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            Our team reads every message and will reply to the email address you gave us.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-1 text-sm font-medium text-brand hover:underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((values) => mutateAsync(values).catch(() => {}))}
      noValidate
      className="flex flex-col gap-4"
    >
      {/* Honeypot: off-screen rather than display:none, out of the tab order and
          out of the accessibility tree. The API refuses a filled one with 403. */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" type="text" tabIndex={-1} autoComplete="off" name="website" defaultValue="" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="contact-name" label="Your name" icon={User} error={errors.name?.message}>
          <input
            id="contact-name"
            placeholder="Your Name"
            autoComplete="name"
            className={cn(controlClass(errors.name), "h-12")}
            {...described("contact-name", errors.name)}
            {...register("name")}
          />
        </Field>

        <Field id="contact-email" label="Your email address" icon={Mail} error={errors.email?.message}>
          <input
            id="contact-email"
            type="email"
            placeholder="Your Email"
            autoComplete="email"
            className={cn(controlClass(errors.email), "h-12")}
            {...described("contact-email", errors.email)}
            {...register("email")}
          />
        </Field>

        <Field id="contact-phone" label="Phone number (optional)" icon={Phone} error={errors.phone?.message}>
          <input
            id="contact-phone"
            type="tel"
            placeholder="Phone Number"
            autoComplete="tel"
            className={cn(controlClass(errors.phone), "h-12")}
            {...described("contact-phone", errors.phone)}
            {...register("phone")}
          />
        </Field>

        <Field id="contact-subject" label="Subject (optional)" icon={Building2} error={errors.subject?.message}>
          <input
            id="contact-subject"
            placeholder="Subject"
            className={cn(controlClass(errors.subject), "h-12")}
            {...described("contact-subject", errors.subject)}
            {...register("subject")}
          />
        </Field>
      </div>

      <Field id="contact-message" label="Your message" icon={MessageSquare} error={errors.message?.message}>
        <textarea
          id="contact-message"
          rows={7}
          placeholder="Your Message"
          className={cn(controlClass(errors.message), "py-3.5")}
          {...described("contact-message", errors.message)}
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
        className="inline-flex h-12 w-fit items-center justify-center gap-2 rounded-md bg-brand px-6 text-sm font-medium text-on-brand transition-colors duration-(--duration-fast) hover:bg-brand-dark disabled:opacity-60"
      >
        <Send size={16} strokeWidth={2} aria-hidden="true" />
        {isSubmitting ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}
