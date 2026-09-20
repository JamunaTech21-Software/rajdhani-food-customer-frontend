import { useCallback, useEffect, useRef, useState } from "react";

import { GOOGLE_CLIENT_ID } from "../config.js";
import { api } from "../lib/api.js";
import { toSession } from "../lib/session.js";
import { useAuthStore } from "../stores/authStore.js";

const SCRIPT_ID = "google-identity";
const SRC = "https://accounts.google.com/gsi/client";

/**
 * Load Google Identity Services once, however many buttons ask for it.
 *
 * A second `<script>` for the same library re-initialises it and the first
 * button stops responding, so the element is looked up before it is created and
 * the promise is shared.
 */
let loading = null;

function loadGis() {
  if (!GOOGLE_CLIENT_ID) return Promise.resolve(false);
  if (window.google?.accounts?.id) return Promise.resolve(true);

  loading ??= new Promise((resolve) => {
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve(true), { once: true });
    // Blocked by an extension, or offline. The caller shows its own message
    // rather than leaving an empty space where a button was promised.
    script.addEventListener("error", () => resolve(false), { once: true });
    document.head.append(script);
  });

  return loading;
}

/**
 * Google sign-in (§7.1) — the only way into a customer account.
 *
 * There is no password flow anywhere on this site, by design: no registration
 * endpoint, no reset, no credential for anyone to phish or for us to store.
 * The browser gets an ID token from Google, the API verifies it against
 * Google's published keys — signature, algorithm, issuer, **audience**, expiry
 * and `email_verified` — and creates the account on first sign-in.
 *
 * **Hidden, not broken, when no client ID is configured.** None is set today.
 * Rendering the button anyway would open a Google dialog reading "invalid
 * client", which is worse than an absent button, and a site whose sign-in is
 * visibly broken is worse than one that does not offer it yet.
 *
 * Returns a ref to attach to the element Google renders its button into —
 * Google renders its own, because a custom button would need the One Tap
 * prompt or a popup flow, and both are far easier to get subtly wrong.
 */
export function useGoogleSignIn({ onSignedIn } = {}) {
  const container = useRef(null);
  const [state, setState] = useState(GOOGLE_CLIENT_ID ? "loading" : "unconfigured");
  const [error, setError] = useState(null);
  const setSession = useAuthStore((s) => s.setSession);

  // A ref, so re-rendering with a new callback does not re-initialise Google —
  // `initialize` is not cheap and re-running it drops the rendered button.
  // Written in an effect rather than during render: a ref assigned while
  // rendering is a value React may discard, and the lint rule says so.
  const onDone = useRef(onSignedIn);
  useEffect(() => {
    onDone.current = onSignedIn;
  }, [onSignedIn]);

  const handleCredential = useCallback(
    async (response) => {
      setError(null);
      setState("signing-in");

      try {
        // `credential` is what Google calls it. The API accepts `id_token` too,
        // and sending Google's own name keeps one less thing to explain.
        const session = toSession(
          await api.post("/auth/customer/google", { credential: response.credential }, { auth: false }),
        );

        if (!session) throw new Error("no session");

        setSession(session);
        onDone.current?.(session);
      } catch (cause) {
        setState("ready");
        setError(
          cause?.status === 403
            ? "This account has been suspended. Please contact us."
            : "We could not sign you in just now. Please try again.",
        );
      }
    },
    [setSession],
  );

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return undefined;

    let cancelled = false;

    loadGis().then((ready) => {
      if (cancelled) return;
      if (!ready || !container.current) {
        setState("unavailable");
        return;
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredential,
        // No One Tap: an automatic prompt on a catalogue page interrupts
        // someone who came to look at tea, and §18 treats that as a failure.
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      window.google.accounts.id.renderButton(container.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "left",
        width: 280,
      });

      setState("ready");
    });

    return () => {
      cancelled = true;
    };
  }, [handleCredential]);

  return { container, state, error };
}
