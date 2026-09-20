# About page — reference alignment plan

**Reference:** `c:\Users\ACTIVE\Desktop\Rajdhani-website\Rajdhani About Us.png`
**Target:** `/about` — `src/pages/AboutPage.jsx` and the shared inner-page chrome
**Started:** 2026-09-20

Same method as `homepage-plan.md`: the comp is read with a PNG decoder and
measured in pixels, scaled ×1.25 from its 1024-wide frame to our 1280
container, and the result is checked in a headless browser rather than
eyeballed.

---

## A1 — the banner ✅ *done 2026-09-20*

### What the comp draws

| Part | Comp (1024 frame) | At 1280 |
|---|---|---|
| Band height | 237px | **296px** |
| Left inset | 79px | 99px |
| Top padding to heading ink | 69px | 86px |
| "About Us" | 27px cap height, display serif, white | ~48px type |
| Breadcrumb | "Home » About Us", link in light green + underline, current page white bold | ~16px |
| Subtitle | two lines, 20px pitch | 18px on a 25px line |
| Scrim | #0a1612 at the left edge, #1a2d18 at 300, #807b47 at 600, #a3ab02 at 750 | left-to-right |

No eyebrow, and **no rule under the heading**.

### What changed

**The image.** `about-us-banner.png` (1774×887) uploaded to Cloudinary through
the signed flow — `POST /admin/media/signature`, straight to Cloudinary, then
`POST /admin/media` to register it — and attached to the `ABOUT_HERO` row as
`desktop_image_id`. It had been a placehold.co placeholder. The comp folder
under `public/RajdhaniPagesRequireImages/` is untouched.

**The copy**, on the same row, to what the comp shows: title "About Us" (was
"Twenty-Five Years of Tea"), eyebrow cleared (was "WHO WE ARE"), subtitle
"Delivering premium quality tea that reflects the richness of nature and the
trust of millions." The public payload is cached, so this needed
`POST /admin/cache/purge` before it appeared.

**The scrim: flat → gradient, with a floor.** A flat `bg-ink` at the slider's
value guarantees contrast by throwing the photograph away. The comp darkens
the left and leaves the tea garden at full brightness two thirds across.

The floor is the part that matters: the live row's `overlay_opacity` is **40**,
which rendered a white "About Us" on a sunlit hillside. `MINIMUM_PROTECTION`
is 0.85 — the comp's own left-edge coverage — and the slider may still add to
it but not take it away. Exactly the argument the home hero's floor records.

**Flat below `lg`.** The gradient clears at 72% of the viewport, which
protects the text only while the text is in the left two thirds. `max-w-xl`
runs the full width of a phone, and the browser showed "the trust of
millions" on bright sky at 390. This is the *second* time this exact mistake
has been found in two days — see the home page's H16 — so it is worth stating
as a rule: **a horizontal scrim is a desktop device and needs a breakpoint.**

**The breadcrumb moved.** It was a white chip pinned to the bottom-right of
the band, hanging a section of margin below it and square-bottomed so that it
read as a tab. The comp sets heading, breadcrumb and subtitle as one
left-aligned block. Still a `nav` + `ol` + `aria-current` — where it sits
changed, not what it is. The word "Home" rather than a house glyph, because
the comp spells it and a one-icon breadcrumb needs its name supplied
separately.

**The gold rule under the heading is gone.** The comp draws none.

### Verified

Rendered at 1280 and 390 in headless Chrome. The band comes out **299px
against the comp's 296**, so the existing `lg:pt-16 / lg:pb-16` was already
right and did not need touching.

### Blast radius — worth a look before sign-off

`PageHero` is shared. These changes reach **Quality, Gallery, News, Contact
and the legal pages** as well as About. That is intended — they are one banner
in one design — but only About has a comp, so the others deserve a glance.

Their content is a separate matter, and mostly missing: `CONTACT_HERO`,
`QUALITY_HERO` and `NEWS_HERO` have **no banner row at all**, so those pages
fall back to `title` on a plain `bg-brand-deep`. `GALLERY_HERO` and
`DEALER_HERO` have real images. Banner photographs for contact, distribution
and gallery are sitting unused in
`public/RajdhaniPagesRequireImages/`.

---

## A2 — "Our Company" ✅ *done 2026-09-20*

The component was already the right shape — eyebrow, heading, body, CTA on
the left and the image on the right, from one `PageBlock`. What was wrong was
the content, the column ratio and the card.

### Measured off the comp (1024 frame → 1280)

| | Comp | At 1280 |
|---|---|---|
| Band height | 312px | 390px |
| Text column | x 80..397 | 396px wide |
| Photograph | x 490..949, y 324..579 | 575×320, **ratio 1.80** |
| Gutter between them | 93px | 116px |
| Split | | **41% / 59%** |

### Content, through admin

The `our_story` block read "OUR STORY / Built on One Blend" with a
placehold.co image and no CTA. Now:

* eyebrow **Our Company**, heading **Rajdhani Food Products**
* the comp's two paragraphs, with `<strong>quality, care and dedication</strong>`
  — `strong` is on the API's HTML Purifier allow-list, so the bold run
  survives sanitising
* CTA **Learn More About Us**
* the building photograph

**The CTA's destination is a guess and should be checked.** The comp draws the
button on the About page itself, which cannot link to where it is, so it
points at `/quality` — the natural "more about us" from here. One admin edit
if it should go somewhere else.

### Layout

**41 / 59, not 50 / 50.** `lg:grid-cols-[0.7fr_1fr]` — 0.7/1.7 is 41.2% — with
`lg:gap-28` for the comp's 116px gutter. This helps the component's other two
users as well: About's "Our Strength" puts five process steps in the wide half
and Quality's commitment block a feature grid, and both were squeezed into 50%.

**The card is `rounded-lg shadow-card`**, 16px and a soft lift off the
near-white band. `rounded-xl` is 24px, which on a 575px-wide photograph reads
as a rounded button.

### The photograph, and one thing to check

`about-us-building.png` is **RGBA with the sky and forecourt fully
transparent** — 59% opaque, a cut-out of the building. The comp shows the same
building against a **blue sky with clouds**. So whoever made the comp had a
version with a sky, and the file in the reference folder is not it.

On the page the cut-out reads as a building on a white card, which looks
deliberate rather than broken — but it is not what the comp draws. **If there
is a sky version, send it and it is one upload.**

Its opaque content is 1514×871, ratio 1.74 — near enough the comp's 1.80, with
112px of transparent sky above it. Uploading it whole gave a 1.50 card, 439px
tall against the comp's 320, with the building floating in white space. So the
*asset* is cropped to 1.80 rather than the component forced to a fixed ratio:
the comp crops the picture, and `PageBlockSection` should keep rendering
whatever ratio an editor uploads. The crop is vertical only, centred on the
opaque content, and takes away transparent air. The original in
`public/RajdhaniPagesRequireImages/` is untouched.

Rendered at 1280 and 390 in headless Chrome. The page is 73px shorter than
before the crop and the band matches the comp's proportions.

---

## Still to do on this page

Working down the comp: "Our Mission, Vision & Values" as three cards, the stats band on green, "Our
Strength" with the five numbered process steps, and "Our Certifications".
Each needs the same measure-then-build pass.

---

## Note on this file

Keep it in `frontend/customer/`. `src/index.css` carries
`@source not "../*.md"`, which stops Tailwind scanning markdown here for class
names — without it every class quoted above would be compiled into the
production bundle, including ones this work removed.
