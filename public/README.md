# Not served

This folder is **not** the Vite public directory — `static/` is (see
`vite.config.js`). Nothing here is copied into a build or deployed.

It holds the approved design comps (`RajdhaniWebsiteReferenceImages/`) and the
image set the client supplied for each page (`RajdhaniPagesRequireImages/`).
Together they are **161 MB**, and while they lived in the real public directory
every one of them was copied into `dist/` and would have been published — a
162 MB deployment of which 696 KB was the site.

They are also gitignored, so they stay on the machine that has them rather than
in the repository. The images an editor actually uploads live in Cloudinary and
reach the site through the API (§12); nothing in the bundle should come from
here.

`icons.svg` is an unused leftover from the Vite starter, and `favicon.svg` is
the leaf mark that was the tab icon until `rajdhani-logo.png` replaced it. Both
are kept and neither is referenced, which is why they are here rather than in
`static/` — that folder holds what the site serves and nothing else.
