import { Component } from "react";

import { ErrorState } from "./StatePanel.jsx";

/**
 * Stop one broken component taking the page with it (§10.5).
 *
 * Without a boundary anywhere in the tree, React's answer to a render error is
 * to unmount the **whole application** — not the component that threw, the
 * whole thing. The visitor gets a white screen with no header, no footer and no
 * way back, and nothing on it says what happened. That is the worst failure
 * mode this ticket exists to remove, and until now the site had no defence
 * against it at all.
 *
 * A class, because `componentDidCatch` and `getDerivedStateFromError` have no
 * hook equivalent. This is the one place in the codebase that needs one.
 *
 * **What no boundary catches**: errors thrown from an event handler, a
 * `setTimeout` or inside a promise. Those do not happen during render, so React
 * never sees them. Failed requests are react-query's job and the page renders
 * those as an `ErrorState` itself; this is for the bugs — a null the shape of
 * the payload said could not be null.
 */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // No error-reporting service is configured (§14 names none), so the console
    // is where this can go. Worth logging even so: without it a caught error
    // leaves no trace at all and the fallback panel is the only evidence
    // anything happened.
    console.error("[boundary]", this.props.name ?? "unnamed", error, info?.componentStack);
  }

  /**
   * Try again by discarding the error and re-rendering.
   *
   * Honest about its limits: if the cause is in the data rather than a
   * transient, this walks straight back into the same error. Still worth
   * offering — a re-render after the query cache has moved on often does
   * succeed, and the alternative is a panel with no way forward.
   */
  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const title = this.props.title ?? "This section could not be shown";

    const panel = (
      <ErrorState error={error} title={title} onRetry={this.reset}>
        Something went wrong drawing this part of the page. The rest of it still works.
      </ErrorState>
    );

    // `inline` is for a boundary already inside a laid-out column — one of the
    // two in `VoicesBand`, say. Wrapping there would add the page's gutters a
    // second time, inside a track that already has them.
    if (this.props.inline) return panel;

    // Otherwise the page's own container and rhythm. A full-bleed panel butting
    // against whatever rendered above it reads as part of that section rather
    // than as a replacement for the one that is missing.
    return (
      <div className="mx-auto max-w-(--container-max) py-(--space-section) pl-(--gutter-l) pr-(--gutter-r)">
        {panel}
      </div>
    );
  }
}
