import * as Dialog from "@radix-ui/react-dialog";
import { CircleCheck, Copy, Download, Home } from "lucide-react";
import { Link } from "react-router";

import { formatDate, toDate } from "../../lib/format.js";

/**
 * The application success modal (§10.3, acceptance §18.5).
 *
 * Its three fields come straight from `DealerApplicationSubmissionResult`, which
 * the backend built for exactly this panel — `applicationId`, `submittedAt` and
 * `expectedResponseWindow`. Nothing here is composed from elsewhere, so the
 * modal cannot disagree with what was recorded.
 *
 * `expectedResponseWindow` is the admin-configurable
 * `settings.dealer_application_response_window`, returned with the response
 * rather than fetched separately — so the SLA text is editable without a deploy
 * and the visitor is told what the business currently promises.
 */
export function DealerSuccessModal({ result, onOpenChange, brochure }) {
  if (!result) return null;

  const submittedAt = toDate(result.submittedAt);

  return (
    <Dialog.Root open onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[32rem] max-w-[calc(100%-2rem)] overflow-y-auto -translate-x-1/2 -translate-y-1/2 overflow-x-hidden rounded-xl bg-surface shadow-modal">
          <div className="px-6 py-8 text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-success-tint text-success">
              <CircleCheck size={32} strokeWidth={1.75} aria-hidden="true" />
            </span>

            <Dialog.Title className="mt-5 font-display text-2xl font-bold text-ink">
              Application Submitted
            </Dialog.Title>

            <Dialog.Description className="mt-2 text-ink-muted">
              Thank you for your interest in partnering with us. Our team will review your
              application and get in touch.
            </Dialog.Description>

            <dl className="mt-6 divide-y divide-line rounded-lg border border-line text-left">
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="text-sm text-ink-muted">Application ID</dt>
                <dd className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-brand">
                    {result.applicationId}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(result.applicationId).catch(() => {})}
                    aria-label="Copy application ID"
                    className="grid size-7 place-items-center rounded-md text-ink-subtle hover:bg-ground hover:text-ink"
                  >
                    <Copy size={14} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </dd>
              </div>

              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="text-sm text-ink-muted">Submitted</dt>
                <dd className="text-sm text-ink">
                  {submittedAt ? (
                    <time dateTime={submittedAt.toISOString()}>
                      {formatDate(result.submittedAt)}
                      {", "}
                      {new Intl.DateTimeFormat("en-GB", {
                        timeZone: "Asia/Dhaka",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(submittedAt)}
                    </time>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>

              {result.expectedResponseWindow ? (
                <div className="flex items-center justify-between gap-4 px-4 py-3">
                  <dt className="text-sm text-ink-muted">Expected response</dt>
                  <dd className="text-sm font-medium text-ink">{result.expectedResponseWindow}</dd>
                </div>
              ) : null}
            </dl>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {/* Only when the download actually resolves — no download rows
                  exist yet, so this is currently hidden rather than dead. */}
              {brochure ? (
                <a
                  href={brochure.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-md border border-line px-5 text-sm font-medium text-ink hover:border-brand hover:text-brand"
                >
                  <Download size={16} strokeWidth={2} aria-hidden="true" />
                  {brochure.title ?? "Download Brochure"}
                </a>
              ) : null}

              <Link
                to="/"
                onClick={() => onOpenChange(false)}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-md bg-brand px-5 text-sm font-medium text-on-brand hover:bg-brand-dark"
              >
                <Home size={16} strokeWidth={2} aria-hidden="true" />
                Back to Home
              </Link>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
