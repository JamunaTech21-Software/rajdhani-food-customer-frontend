import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { ApiError, ErrorCode } from "@shared/api/errors.js";

import { accountApi } from "../../lib/api.js";
import { cn } from "../../lib/cn.js";
import { hasProfileChanges, initialProfile, profileUpdate } from "../../lib/session.js";
import { useAuthStore } from "../../stores/authStore.js";

const FIELDS = [
  { name: "phone", label: "Phone number", type: "tel", autoComplete: "tel" },
  { name: "city", label: "City", autoComplete: "address-level2" },
  { name: "company_name", label: "Company or shop", autoComplete: "organization" },
];

/**
 * The three fields a customer owns (§9.7).
 *
 * Name, email and picture are absent on purpose: Google owns them and
 * overwrites them at the next sign-in, so a form offering them would quietly
 * discard whatever was typed. Email is the identity key besides.
 *
 * These three are the ones that pre-fill an enquiry, which is the whole
 * practical point of having an account on a site with no cart.
 */
export function ProfileForm({ customer }) {
  const setCustomer = useAuthStore((s) => s.setCustomer);
  const [values, setValues] = useState(() => initialProfile(customer));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const { mutate, isPending } = useMutation({
    mutationFn: () => accountApi.patch("/auth/customer/me", profileUpdate(values)),
    onSuccess: (updated) => {
      // The API answers with the whole profile, so the store takes its word
      // rather than assuming the patch applied exactly as sent.
      if (updated) setCustomer(updated);
      setSaved(true);
      setError(null);
    },
    onError: (cause) => {
      setSaved(false);
      setError(
        cause instanceof ApiError && cause.code === ErrorCode.VALIDATION_ERROR
          ? Object.values(cause.fieldErrors)[0] ?? cause.message
          : "We could not save that just now. Please try again.",
      );
    },
  });

  const dirty = hasProfileChanges(values, customer);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (dirty) mutate();
      }}
      className="flex flex-col gap-4"
    >
      {FIELDS.map((field) => (
        <label key={field.name} className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">{field.label}</span>
          <input
            type={field.type ?? "text"}
            autoComplete={field.autoComplete}
            value={values[field.name]}
            onChange={(event) => {
              setValues((current) => ({ ...current, [field.name]: event.target.value }));
              setSaved(false);
            }}
            className="h-11 rounded-md border border-line bg-surface px-3 text-sm text-ink"
          />
        </label>
      ))}

      {error ? (
        <p role="alert" className="rounded-md bg-danger-tint p-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          // Disabled while unchanged, so the button says whether there is
          // anything to save rather than accepting a no-op PATCH.
          disabled={!dirty || isPending}
          className={cn(
            "inline-flex h-11 items-center rounded-md bg-brand px-5 text-sm font-medium text-on-brand",
            "transition-colors duration-(--duration-fast) hover:bg-brand-dark",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>

        {saved && !dirty ? (
          <p role="status" className="text-sm text-success">
            Saved.
          </p>
        ) : null}
      </div>

      <p className="text-xs leading-relaxed text-ink-subtle">
        Your name, email address and picture come from Google and are refreshed each time you sign
        in, so they cannot be edited here.
      </p>
    </form>
  );
}
