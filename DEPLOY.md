# Deploying the customer site to Vercel

**This is a monorepo.** The git root is `rajdhani-food-project/`, which also
holds the admin dashboard and the PHP API. Vercel must be told to build from
`frontend/customer` — that is the one setting without which nothing else here
matters.

---

## 1. Create the project

1. **Add New → Project**, import the GitHub repository.
2. **Root Directory → Edit → `frontend/customer`.**
   Do this before the first deploy. Left at the repository root, Vercel finds no
   `package.json` and the build fails immediately — which is the good case; the
   bad one is it finding the *admin* app and deploying that instead.
3. Framework Preset should read **Vite** on its own. Build command, output
   directory and install command all come from `vercel.json` in that folder —
   leave them on Vercel's defaults rather than overriding them in the dashboard,
   or the two will disagree and the file will quietly lose.

---

## 2. Set the environment variables

**Project → Settings → Environment Variables**, for **Production** *and*
**Preview** (a preview build with no variables fails the same way a production
one does — see §4).

| Name | Required | Value |
|---|---|---|
| `VITE_BASE_URL` | **yes** | The API origin **including `/api/v1`** — e.g. `https://api.rajdhanifood.com/api/v1` |
| `VITE_SITE_URL` | no | This site's own origin, for canonical URLs and JSON-LD. Defaults to `https://rajdhanifood.com` |
| `VITE_RECAPTCHA_SITE_KEY` | no | reCAPTCHA v3 **site** key. The forms work without it |

`.env.local` is gitignored, so it never reaches GitHub and Vercel never sees it.
It configures your machine only. `.env.example` is the documentation.

**If Vercel will not accept the `VITE_` prefix**, the name is negotiable. Vite
only auto-exposes `VITE_` variables to the browser, but the *build* can read
anything Vercel sets, so `vite.config.js` takes the first of these it finds:

| Purpose | Accepted names, most specific first |
|---|---|
| API origin | `VITE_BASE_URL`, `VITE_API_BASE_URL`, `API_BASE_URL`, `BASE_URL` |
| Site origin | `VITE_SITE_URL`, `SITE_URL` |

The build log names the one it used:

```
[env] API base URL from VITE_BASE_URL=https://api.rajdhanifood.com/api/v1
```

Check that line after changing a variable. **Everything with a `VITE_` prefix is
compiled verbatim into the public JavaScript bundle** — no secret belongs in any
of them. The Cloudinary API secret and the reCAPTCHA *secret* key live in
`backend/api/.env` on the API server and nowhere else.

---

## 3. What is already configured, and where

| | |
|---|---|
| `vercel.json` | SPA rewrite (every path → `index.html`, or a deep link 404s), `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and immutable caching on `/assets/*` |
| `csp.js` + `vite.config.js` | The Content-Security-Policy, injected as a meta tag at build time. It has to name the API origin in `connect-src`, and that origin is an environment variable — which is why it is built rather than written into `vercel.json` |
| `package.json` | `engines.node` is `>=20.19`; Vercel picks a matching runtime |
| `static/` | The Vite public directory — **not** `public/`. See §5 |

**No `X-Robots-Tag`.** The admin's config carries `noindex`; this one must not.
Copying that file wholesale would be the quiet end of §14.3.

---

## 4. A production build with no API URL is refused

`config.js` falls back to `http://localhost:8000/api/v1` when nothing is set.
That is right for a developer who has not written a `.env` yet, and
catastrophic on a host: the site builds, deploys, serves, and every request goes
to the *visitor's own machine*. Nothing is logged anywhere anyone would look,
and the page shows its empty states forever.

So the build stops instead:

```
Error: No API base URL is set, so this build would ship pointing at localhost.
  Set one of: VITE_BASE_URL, VITE_API_BASE_URL, API_BASE_URL, BASE_URL
  On Vercel: Project → Settings → Environment Variables. See DEPLOY.md.
```

A failed build is a much better outcome than a deployed one that cannot reach
anything. `vite dev` is unaffected.

---

## 5. Why `public/` is not the public directory

`public/` holds the approved comps (`RajdhaniWebsiteReferenceImages/`) and the
client's supplied image set (`RajdhaniPagesRequireImages/`) — **161 MB** between
them. While that was the Vite public directory every build copied all of it into
`dist/`, so a deploy would have published the entire design archive:

```
before   dist  162 MB
after    dist  712 KB
```

Two things keep it that way, and both are needed:

* `publicDir: "static"` in `vite.config.js`, so a build never copies them.
* Both folders are gitignored, so they never reach GitHub or Vercel at all.

They are untouched on disk. The images the site actually shows are uploaded by
editors to Cloudinary and arrive through the API (§12) — nothing in the bundle
should ever come from `public/`.

---

## 6. Before the first deploy

The customer app is largely **untracked** — most of `src/` has never been
committed. `git status` before pushing, and check that these are staged:

```
frontend/customer/src/            components, pages, hooks, lib, stores, shared
frontend/customer/tests/
frontend/customer/csp.js  eslint-rules/  vercel.json  static/
frontend/customer/.env.example  DEPLOY.md  plan.md
frontend/customer/package.json  package-lock.json  vite.config.js  index.html
```

and that these are **not**:

```
frontend/customer/.env.local                      your machine only
frontend/customer/dist/                           built by Vercel
frontend/customer/public/Rajdhani*Images/         161 MB of comps
```

`npm ci` needs `package-lock.json`, so that one must be committed.

---

## 7. Checks before you point a domain at it

- [ ] The build log shows `[env] API base URL from …` with the right origin.
- [ ] The API's CORS allowlist includes the Vercel origin — otherwise every
      request fails with nothing useful in the console (`backend/api/config/cors.php`).
- [ ] A deep link works: open `/products/<slug>` directly, not by navigating.
      If it 404s, the rewrite in `vercel.json` is not being applied, which means
      the Root Directory is wrong.
- [ ] The contact form submits. It exercises CORS, the CSP's `connect-src` and
      the API in one action.
- [ ] Check the Console for CSP violations. A blocked resource is silent on the
      page and loud there.
- [ ] `plan.md` §6 — the responsive width sweep is still unrun. Do it against
      the deployed URL with `tests/viewport-audit.js`.
