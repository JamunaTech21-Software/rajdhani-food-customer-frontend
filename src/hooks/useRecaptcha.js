import { useCallback, useEffect, useRef } from "react";

import { RECAPTCHA_SITE_KEY } from "../config.js";

const SCRIPT_ID = "recaptcha-v3";

/**
 * A reCAPTCHA v3 token for one action (§14.2, RTPP-34).
 *
 * v3 is invisible — there is no checkbox and nothing to click. It scores the
 * visitor in the background, so the only job here is to have the script loaded
 * by the time the form is submitted and to hand back a token.
 *
 * **Entirely optional.** No site key is configured yet, and the API accepts
 * submissions without a token while its own secret is unset. So an unconfigured
 * key means no script, no token, and a form that still works — rather than a
 * conversion path blocked on a key nobody has added. The moment the key appears,
 * tokens start flowing with no code change.
 *
 * The script is loaded lazily, when a form that needs it mounts, rather than on
 * every page: it is ~80 kB and it phones Google on load.
 */
export function useRecaptcha(action) {
  const loading = useRef(null);

  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY || document.getElementById(SCRIPT_ID)) return;

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(RECAPTCHA_SITE_KEY)}`;
    script.async = true;
    document.head.append(script);
  }, []);

  return useCallback(async () => {
    if (!RECAPTCHA_SITE_KEY) return null;

    try {
      // grecaptcha appears asynchronously; ready() is how it says it is there.
      loading.current ??= new Promise((resolve) => {
        const check = () => {
          if (window.grecaptcha?.ready) window.grecaptcha.ready(resolve);
          else setTimeout(check, 100);
        };
        check();
      });

      await loading.current;
      return await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
    } catch {
      // A blocked or failed script must not stop someone enquiring. The API
      // decides what an absent token is worth, which is the right place for it.
      return null;
    }
  }, [action]);
}
