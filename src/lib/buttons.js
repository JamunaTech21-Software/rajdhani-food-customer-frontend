/**
 * The two button shapes the state panels use (§10.5).
 *
 * Here rather than in the component file for a dull reason: a module that
 * exports both components and constants breaks Fast Refresh, and the lint rule
 * that enforces it is right to. The rest of the site still writes these inline
 * — this is not a refactor of that, only somewhere for the new panels to agree.
 */

/** The primary way out of an empty or failed state. */
export const ACTION_CLASS =
  "inline-flex h-11 items-center gap-2 rounded-md bg-brand px-5 text-sm font-medium text-on-brand transition-colors duration-(--duration-fast) hover:bg-brand-dark";

/** The secondary one, where there are two and only one is the obvious choice. */
export const ACTION_QUIET_CLASS =
  "inline-flex h-11 items-center gap-2 rounded-md border border-line px-5 text-sm font-medium text-ink transition-colors duration-(--duration-fast) hover:bg-ground";
