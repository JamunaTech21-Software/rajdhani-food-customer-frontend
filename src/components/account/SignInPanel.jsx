import { useGoogleSignIn } from "../../hooks/useGoogleSignIn.js";

/**
 * The only way in (§7.1).
 *
 * No password field, because there is no password: no registration endpoint, no
 * reset, no credential to phish or for us to store. The account is created by
 * the first successful Google sign-in.
 *
 * Four states, and the last two are the ones that usually get skipped. An
 * absent client ID and a blocked script look identical to a visitor — an empty
 * space where a button was promised — so both say what happened and both offer
 * the way round it, which is that nothing on this site needs an account.
 */
export function SignInPanel({ onSignedIn, title = "Sign in", description }) {
  const { container, state, error } = useGoogleSignIn({ onSignedIn });

  return (
    <div className="mx-auto max-w-md rounded-xl border border-line bg-surface p-6 text-center sm:p-8">
      <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
        {description ??
          "Sign in with Google to see the reviews you have written and to have your details filled in for you."}
      </p>

      <div className="mt-6 flex min-h-[44px] justify-center">
        {/* Google renders its own button in here. A custom one would need the
            One Tap prompt or a popup flow, and both are easy to get subtly
            wrong in ways that only show up on someone else's device. */}
        <div ref={container} aria-busy={state === "signing-in"} />

        {state === "loading" ? (
          <div role="status" aria-label="Loading sign-in" className="h-11 w-[280px] animate-pulse rounded-md bg-ground" />
        ) : null}
      </div>

      {state === "unconfigured" ? (
        <p className="mt-4 text-sm text-ink-muted">
          Sign-in is not switched on yet. Everything else on the site works without an account —
          you can browse, enquire and apply for a dealership as you are.
        </p>
      ) : null}

      {state === "unavailable" ? (
        <p role="alert" className="mt-4 text-sm text-ink-muted">
          Google’s sign-in could not load. A privacy extension or an offline connection will do
          that. Everything else on the site works without an account.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-4 rounded-md bg-danger-tint p-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <p className="mt-6 text-xs leading-relaxed text-ink-subtle">
        We receive your name, email address and profile picture from Google. Nothing is posted on
        your behalf and there is no password to remember.
      </p>
    </div>
  );
}
