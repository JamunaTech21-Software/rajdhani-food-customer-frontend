import { ACTION_CLASS } from "../../lib/buttons.js";
import { cn } from "../../lib/cn.js";
import { FAILURE_COPY, failureKind } from "../../lib/loadState.js";

/**
 * The panel every empty and error state is drawn in (§10.5).
 *
 * One shape, so the site says "nothing here" the same way in all eleven places
 * it needs to. Bordered rather than tinted: these appear inside page content,
 * often above a section that is working perfectly, and a coloured block reads
 * as an alarm when most of these are not alarming.
 */
function Panel({ children, className, ...rest }) {
  return (
    <div {...rest} className={cn("rounded-xl border border-line p-6 text-center sm:p-10", className)}>
      {children}
    </div>
  );
}

function Title({ children }) {
  return <p className="font-display text-xl font-semibold text-ink">{children}</p>;
}

/**
 * A list, section or page with nothing in it — and nothing wrong.
 *
 * **Not an alert.** A catalogue that no editor has filled in yet is the
 * expected state of a new brand, and announcing it as a problem to a screen
 * reader is both wrong and alarming. The error panel below is the one that
 * announces.
 *
 * `action` is the way out. An empty state with no next step is a dead end, and
 * on a filtered list the way out is almost always "clear the filter" rather
 * than the browser's Back button.
 */
export function EmptyState({ title, children, action, className }) {
  return (
    <Panel className={className}>
      <Title>{title}</Title>
      {children ? <div className="mt-2 text-ink-muted">{children}</div> : null}
      {action ? <div>{action}</div> : null}
    </Panel>
  );
}

/**
 * A section that could not load.
 *
 * `error` picks the wording, because the three cases a visitor can act on
 * differently deserve different sentences — and a "Try again" button offered
 * for a 404 is a button that is guaranteed not to work.
 *
 * `role="alert"` so it is announced: unlike an empty state, this one interrupts
 * what the visitor came to do.
 */
export function ErrorState({ error, title, children, onRetry, retryLabel = "Try again", className }) {
  const kind = failureKind(error, {
    // Only trusted when it says false — a browser reporting `true` may still be
    // on a captive portal or a dead Wi-Fi network.
    online: typeof navigator === "undefined" || navigator.onLine !== false,
  });
  const copy = FAILURE_COPY[kind];

  return (
    <Panel role="alert" className={className}>
      <Title>{title ?? copy.title}</Title>
      <div className="mt-2 text-ink-muted">{children ?? copy.body}</div>

      {onRetry && copy.retry ? (
        <button type="button" onClick={onRetry} className={cn("mt-6", ACTION_CLASS)}>
          {retryLabel}
        </button>
      ) : null}
    </Panel>
  );
}

/**
 * The same two, sized for a whole page rather than a section.
 *
 * Used by the 404 and the error boundary, where there is no surrounding content
 * to sit inside and a bordered box floating in an empty viewport looks like a
 * mistake.
 */
export function PageState({ title, children, action }) {
  return (
    <div className="mx-auto max-w-lg py-24 text-center pl-(--gutter-l) pr-(--gutter-r)">
      <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
      <div className="mt-3 leading-relaxed text-ink-muted">{children}</div>
      {action ? <div className="mt-8 flex flex-wrap justify-center gap-3">{action}</div> : null}
    </div>
  );
}
