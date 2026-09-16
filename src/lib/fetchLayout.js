/**
 * The one network call the boot makes, as a plain function.
 *
 * Separate from `bootstrap.js` so it can be tested for real rather than by
 * reading the source: that module imports `config.js`, which reads
 * `import.meta.env` — a Vite construct that throws under plain node. Taking the
 * base URL as an argument is what makes the two failure modes below testable,
 * and they are the ones RTPP-57's second criterion turns on.
 *
 * Deliberately plain `fetch`: this runs before React, before the query client
 * and before any store the API client reads from. `/public/layout` is public, so
 * there is no token to attach.
 */
export async function fetchLayout(baseUrl, { signal } = {}) {
  const response = await fetch(`${baseUrl}/public/layout`, {
    headers: { Accept: "application/json" },
    signal,
  });

  // Two distinct failures, and both have to reach the caller's catch or the
  // boot sits at "loading" forever.
  if (!response.ok) {
    throw new Error(`Layout request failed with ${response.status}`);
  }

  const body = await response.json();

  // A 200 carrying `success: false` is the §9.1 envelope's way of reporting an
  // application error. Trusting the status code alone would hand the store an
  // `undefined` site and call it ready.
  if (!body?.success) {
    throw new Error(body?.error?.message ?? "Layout request was unsuccessful");
  }

  return body.data;
}
