import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { ApiError, ErrorCode } from "@shared/api/errors.js";

import { cn } from "../../lib/cn.js";
import {
  byDivision,
  dealerApplicationSchema,
  EMPTY_APPLICATION,
  placeName,
  toApplicationPayload,
} from "../../lib/dealerApplication.js";
import { publicApi } from "../../lib/api.js";
import { useDistricts, useUpazilas } from "../../hooks/useLocations.js";
import { useRecaptcha } from "../../hooks/useRecaptcha.js";

function Field({ label, error, required, children }) {
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
      ) : null}
    </label>
  );
}

const controlClass = (invalid) =>
  cn("h-11 rounded-md border bg-surface px-3 text-sm text-ink", invalid ? "border-danger" : "border-line");

/**
 * The dealer application form (§10.3).
 *
 * The district and upazila selects are the interesting part. Selecting a
 * district must repopulate the upazilas *and clear whatever was chosen before* —
 * the API rejects an upazila that does not belong to its district, and without
 * the clear a visitor gets that rejection for a field they cannot see is wrong.
 */
export function ApplicationForm({ onSuccess }) {
  const getRecaptchaToken = useRecaptcha("dealer_application");
  const districts = useDistricts();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(dealerApplicationSchema), defaultValues: EMPTY_APPLICATION });

  // useWatch, not watch(): watch() returns a function the React Compiler
  // cannot memoize, which opts the whole form out of compilation.
  const districtId = useWatch({ control, name: "district_id" });
  const upazilas = useUpazilas(districtId);

  const { mutateAsync } = useMutation({
    mutationFn: async (values) => {
      const recaptchaToken = await getRecaptchaToken();
      return publicApi.post("/public/dealer-applications", toApplicationPayload(values, { recaptchaToken }));
    },
    onSuccess,
    onError: (error) => {
      if (error instanceof ApiError && error.code === ErrorCode.VALIDATION_ERROR) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field, { type: "server", message });
        }
        return;
      }
      if (error instanceof ApiError && error.code === ErrorCode.RATE_LIMITED) {
        setError("root", { message: "You have sent an application recently. Please try again shortly." });
        return;
      }
      setError("root", { message: "We could not send that just now. Please try again, or call us instead." });
    },
  });

  const grouped = byDivision(districts.data?.items);

  return (
    <form
      onSubmit={handleSubmit((values) => mutateAsync(values).catch(() => {}))}
      noValidate
      className="flex flex-col gap-4"
    >
      {/* Honeypot: off-screen rather than display:none, out of the tab order and
          out of the accessibility tree. The API refuses a filled one. */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="dealer-website">Website</label>
        <input id="dealer-website" type="text" tabIndex={-1} autoComplete="off" name="website" defaultValue="" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" required error={errors.full_name?.message}>
          <input autoComplete="name" className={controlClass(errors.full_name)} {...register("full_name")} />
        </Field>

        <Field label="Company or shop name" required error={errors.company_name?.message}>
          <input autoComplete="organization" className={controlClass(errors.company_name)} {...register("company_name")} />
        </Field>

        <Field label="Phone number" required error={errors.phone?.message}>
          <input type="tel" autoComplete="tel" className={controlClass(errors.phone)} {...register("phone")} />
        </Field>

        <Field label="Email address" required error={errors.email?.message}>
          <input type="email" autoComplete="email" className={controlClass(errors.email)} {...register("email")} />
        </Field>

        <Controller
          control={control}
          name="district_id"
          render={({ field }) => (
            <Field label="District" required error={errors.district_id?.message}>
              <select
                {...field}
                onChange={(event) => {
                  field.onChange(event.target.value);
                  // The clear that makes the criterion hold. Without it the old
                  // upazila stays in the form and the API rejects the pairing.
                  setValue("upazila_id", "", { shouldValidate: false });
                }}
                className={controlClass(errors.district_id)}
              >
                <option value="">
                  {districts.isPending ? "Loading districts…" : "Select your district"}
                </option>
                {/* Grouped by division — 64 in one flat list is a scroll. */}
                {grouped.map((group) => (
                  <optgroup key={group.division} label={group.division}>
                    {group.districts.map((district) => (
                      <option key={district.id} value={district.id}>
                        {placeName(district)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>
          )}
        />

        <Field label="Upazila or city" required error={errors.upazila_id?.message}>
          <select
            // Disabled until a district is chosen: the list is meaningless
            // without one, and an enabled empty select invites a click that
            // does nothing.
            disabled={!districtId || upazilas.isPending}
            className={cn(controlClass(errors.upazila_id), "disabled:opacity-60")}
            {...register("upazila_id")}
          >
            <option value="">
              {!districtId
                ? "Choose a district first"
                : upazilas.isPending
                  ? "Loading…"
                  : "Select your upazila or city"}
            </option>
            {(upazilas.data?.items ?? []).map((upazila) => (
              <option key={upazila.id} value={upazila.id}>
                {placeName(upazila)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Message or additional information" error={errors.message?.message}>
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
        className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-md bg-brand px-6 text-sm font-medium text-on-brand transition-colors duration-(--duration-fast) hover:bg-brand-dark disabled:opacity-60"
      >
        <Send size={16} strokeWidth={2} aria-hidden="true" />
        {isSubmitting ? "Sending…" : "Submit Application"}
      </button>
    </form>
  );
}
