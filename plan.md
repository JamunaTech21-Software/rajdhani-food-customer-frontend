# Customer Site — Responsive Completion Plan

**Scope:** `frontend/customer` only. No API changes, no design changes, no new
features. The site already reflows; this is the work that turns "it reflows"
into "it is right at every width we promised".

**Requirement:** `Rajdhani_Project_Doc.md` §10.5 — *"Fully responsive at 360,
768, 1024, 1440, and 1920 px."* Plus §18 (AA) and §14.3, which make layout a
correctness problem rather than a taste one.

**Method:** phases are implemented one at a time, in order, each finishing with
its own tests and a sweep of the width matrix. Phase R1 must go first — it
builds the apparatus the other phases are checked against.

---

## 1. What "perfect" has to mean

"Responsive" is not a yes/no, so this plan does not try to assert one. Each
phase closes against these eight gates, and a phase is not done until its files
pass all eight.

| # | Gate | How it is checked |
|---|---|---|
| G1 | No horizontal scrollbar anywhere between **320 px and 1920 px** | Manual sweep + `overflow` invariant test |
| G2 | No element escapes its container at the five named widths, **plus 640×360 landscape** | Manual sweep |
| G3 | Every interactive target is **≥ 44×44 px**, or ≥ 24 px with clear spacing (WCAG 2.2 AA 2.5.8) | Source-assertion test + sweep |
| G4 | Content reflows without loss at **320 px** and at **200 % zoom** (WCAG 1.4.10, 1.4.4) | Manual sweep |
| G5 | Every `sizes` attribute is within **±15 %** of the width the image actually renders at | Arithmetic test against the grid ramps |
| G6 | Every image box is reserved before it loads — **no layout shift** | Source-assertion test (already partly enforced) |
| G7 | Prose measure stays **≤ 75ch**; no line of body text runs the full width of a desktop | Source-assertion test |
| G8 | Nothing the site draws sits under a **notch, home indicator or browser chrome** | Safe-area inset audit |

**Two widths are deliberately out of scope as targets but must not break:**
320 px (smallest phone still in use; G1 and G4 cover it) and anything above
1920 px (the container caps, and that is the intended behaviour — see D2).

---

## 2. Audit — what is actually wrong today

Evidence gathered 2026-09-17 against the current tree. Every row is a real
finding with a file behind it, not a guess.

### 2.1 The structural problem: a missing middle

Breakpoint usage across all `.jsx` in `src/`:

| Prefix | Width | Usages |
|---|---|---|
| *(base)* | 0 | — |
| `sm:` | 640 | **81** |
| `md:` | 768 | **6** |
| `lg:` | 1024 | **58** |
| `xl:` | 1280 | **8** |
| `2xl:` | 1536 | **0** |

The site has effectively **three** layout states where §10.5 names five. All six
`md:` usages are the same rule (`md:grid-cols-2`) in four files. **768 px — a
named target, and the commonest tablet width — is styled as though it were a
640 px phone.** 1440 and 1920 are styled identically to 1280.

This is the single largest cause of "it behaves like responsive but isn't
perfect", and it is why Phase R2 exists.

### 2.2 Findings by area

| # | Finding | Evidence | Gate | Phase |
|---|---|---|---|---|
| F1 | `100vw` in four dialog widths includes the scrollbar, so each overshoots the viewport by its width on desktop | `EnquiryModal.jsx:115`, `SuccessModal.jsx:29`, `WelcomeBlock.jsx:81`, `Gallery.jsx:108` | G1 | R1 |
| F2 | No `env(safe-area-inset-*)` anywhere in the app | *(zero matches in `src/`)* | G8 | R1 |
| F3 | `sizes` do not match any real ramp. `SIZES.card` claims `25vw ≥1024`; the catalogue is 3-up at 1024 and 4-up inside a 1280 cap, so at 1920 it asks for **480 px** to fill **293 px** — 64 % over | `lib/cloudinary.js:93`, `ProductsPage.jsx:22`, `ProductCard.jsx:32` | G5 | R1 |
| F4 | One `sizes` string serves two different ramps — catalogue is `sm:2 lg:3 xl:4`, related products is `sm:2 lg:4` | `ProductsPage.jsx:22` vs `ProductDetailPage.jsx:191` (both use `SIZES.card`) | G5 | R1 |
| F5 | `SIZES.half` asks for `50vw`; the column is half of a **capped** 1280, so at 1920 it over-fetches by 63 % | `lib/cloudinary.js:95` | G5 | R1 |
| F6 | 768 px falls through to phone styling across the home page, footer, contact and dealer pages | §2.1 above | G2 | R2 |
| F7 | Header nav is `lg:block` — 768 px and 1023 px get the mobile drawer, which is right, but the wordmark truncates hard at 1024–1150 where nav and CTA compete | `Header.jsx:34–58`, `xl:gap-6` only | G2 | R3 ✅ |
| F8 | Drawer close, header burger, footer social and three modal closes are 36–40 px | `MobileDrawer.jsx:42`, `Footer.jsx:85`, `EnquiryModal.jsx:129` | G3 | ~~R3/R6~~ **R1** ✅ |
| F9 | Hero carousel dots are `h-2` — an **8 px** tall target | `Hero.jsx:161` | G3 | R4 ✅ |
| F10 | Hero is `min-h-[32rem]` (512 px) with no short-viewport case; a 640×360 landscape phone cannot see a whole slide | `Hero.jsx:53` | G2, G4 | R4 ✅ |
| F11 | Carousel has arrows but no swipe, and the arrows overlay the headline on a phone | `Hero.jsx:133–150` | G3 | R4 ✅ |
| F12 | Four horizontal scroll strips have no visible affordance that they scroll, and two hide the scrollbar outright | `FeaturedProducts.jsx:43`, `ProductTabs.jsx:50`, `CategoryFilterBar.jsx:31`, `GalleryPage.jsx:20` | G4 | R4 ✅ |
| F13 | Only `EnquiryModal` caps its height. The other four dialogs can exceed a short viewport with no way to scroll | `SuccessModal.jsx:29`, `WelcomeBlock.jsx:81`, `Gallery.jsx:108`, `Lightbox.jsx:56` | G2, G4 | R6 ✅ |
| F14 | Contact's three-panel grid jumps 1 → 2 → 3 at `lg`/`xl` with a 19 rem fixed first column; at 1024 the form is squeezed | `ContactPage.jsx:52` | G2 | R2 |
| F15 | Footer goes `sm:2 lg:3 xl:5` — the 3-column step at 1024 leaves two orphan columns on a second row | `Footer.jsx:65` | G2 | R2 |
| F16 | Gallery masonry is `columns-2` at 320 px, giving ~140 px tiles | `GalleryGrid.jsx:22` | G4 | R5 ✅ |
| F17 | Heading ramp stops at `sm:` on most pages — 1440 and 1920 get phone-tablet type | 15 of 19 headings audited | G4 | R7 — **rejected**, see below |
| F18 | No `2xl:` rules at all; 1920 renders as 1280 with 320 px of dead gutter each side | §2.1 | G2 | R7 ✅ |
| F19 | No automated guard against any of the above — nothing fails when a regression lands | `tests/` | all | R1 |
| F20 | The article column caps at 768, not 1280, but is given `SIZES.content` — it asks for **1280 px** to fill **720 px** on every news article | `NewsArticlePage.jsx:180` | G5 | R1 |
| F21 | The home carousel strip has fixed 240 px tracks below `lg`; a `vw` unit there describes the viewport, not the card | `FeaturedProducts.jsx:43` | G5 | R1 |
| F22 | The lightbox image is given `SIZES.content` although it sits in a `max-w-5xl` dialog, not the container | `Lightbox.jsx:74` | G5 | R1 |
| F23 | The USP strip is pulled up 48 px over the hero with `z-10`, so the hero's dots at `bottom-6` render **behind it** — invisible whenever there is more than one banner | `UspStrip.jsx:63`, `Hero.jsx` | G2 | R4 ✅ |
| F24 | Tailwind scans `plan.md` and the tests for class names and cannot tell a class from a string that looks like one, so every class this work *removed* was still compiled and shipped | `index.css` | — | R4 ✅ |
| F25 | `BulkSupplyCta` takes 1.2 of a 2.2fr split but is given `SIZES.half`, which promises the full width below 1024 — **92 % over at 768** | `BulkSupplyCta.jsx:57` | G5 | R5 ✅ |
| F26 | The product page stacks until 1024, so a tablet gets a 720 px square image above the price | `ProductDetailPage.jsx:157` | G2, G4 | R5 ✅ |
| F27 | The zoomed product image is given `SIZES.content` — the whole 1232 px container, for a dialog capped at 896 | `Gallery.jsx:117` | G5 | R6 ✅ |
| F28 | Two dialogs hang their close button 48 px *above* the frame, where a short viewport has no room for it | `WelcomeBlock.jsx`, `Gallery.jsx` | G2 | R6 ✅ |
| F29 | `--space-section` and `--container-max` are declared in `tokens.css` and read by **nothing** — the rhythm and the container width live in 25 places each | `tokens.css:83`, 24 components | G2 | R7 ✅ |
| F30 | The content containers never took the safe-area gutter R1 added, so a notched phone in landscape clips the first 44 px of every page — chrome was safe, content was not | 10 containers | G8 | R7 ✅ |
| F31 | A field focused on any *page* form scrolls flush to the top of the document and lands **under the 4 rem sticky header** — including the invalid field React Hook Form focuses after a failed submit, so the error is the part you cannot see | `ContactForm`, `ApplicationForm` | G4 | R6 ✅ |
| F32 | The Quality assurance panel is `p-8` with no narrow step, taking 64 px off a 328 px phone, where every other card on the site starts at `p-6` | `QualityPage.jsx:27` | G4 | R5 ✅ |

---

## 3. Decisions taken up front

Settled here so the phases do not re-litigate them.

**D1 — The five widths become named, testable breakpoints.** Tailwind's defaults
(640/768/1024/1280/1536) do not line up with §10.5's targets (360/768/1024/
1440/1920). Rather than fight that, the phases treat the defaults as the
*mechanism* and the five widths as the *acceptance points*: `md:` = 768 exactly,
`lg:` = 1024 exactly, `xl:` (1280) is where 1440 is tested, and a `2xl:` (1536)
tier is added for 1920. No custom screen values — renaming breakpoints in a
codebase this size is churn for its own sake.

**D2 — The 1280 cap stays.** §10.5 asks for the site to *work* at 1920, not to
fill it, and every comp is drawn to a capped column. A full-bleed 1920 layout
would stretch the measure past legibility. What changes at 1920 is the **gutter,
the section rhythm and the type ramp** — so it reads as a large screen rather
than as 1280 with dead space. This is Phase R7's whole brief.

**D3 — No new dependencies.** No container-query polyfill, no CSS-in-JS, no
headless carousel library. Tailwind v4 supports `@container` natively where a
component genuinely needs to respond to its own box rather than the viewport.

**D4 — Verification is tests plus eyes.** Source-assertion tests (the project's
existing `node --test` convention, zero dependencies) catch regressions and
arithmetic. They cannot tell you a layout looks wrong, so every phase also ends
with a manual sweep of the matrix in §1. Both are required; neither substitutes.

**D5 — No design changes.** Where a comp and a breakpoint disagree, the comp
wins and the fix is the breakpoint. Anything that would change what the site
*looks like* at a width it already handles is out of scope and gets raised
rather than done.

---

## 4. The phases

Eight phases, ordered so that each one's foundation is already in place. Sizes
are relative effort, not hours.

---

### Phase R1 — Foundations and guardrails · *large* — ✅ **done**

**Why first:** every later phase is checked against the apparatus this one
builds. Doing it last would mean auditing the same files twice.

* Add `tests/responsive.test.mjs` — the invariant suite behind G1, G3, G5, G6
  and G7: no fixed width above 320 px, every dialog capped and scrollable, every
  scroll strip declared, `sizes` arithmetic checked against the grid ramps it
  actually serves.
* Fix **F1**: replace `100vw` with a scrollbar-safe width in all four dialogs.
* Fix **F2**: safe-area insets on the sticky header, the drawer and every fixed
  element (G8).
* Fix **F3/F4/F5**: rebuild `lib/cloudinary.js`'s `SIZES` from the real ramps,
  accounting for the 1280 cap. Split `card` into the two ramps that exist.
* Add the width-matrix checklist to this file as a living artefact.

**Done when:** the invariant suite passes, the four dialogs sit inside the
viewport with a scrollbar present, and every `sizes` value is within ±15 % of
rendered width at all five widths (G5 arithmetic recorded in the test).

---

#### R1 — completed 2026-09-17

| Delivered | |
|---|---|
| `tests/responsive.test.mjs` | 20 invariants covering G1, G3, G5, G6, G7, G8 |
| `lib/cloudinary.js` | `SIZES` now **derived** from each grid's ramp by `gridSizes()`; `renderedWidth()` exported so the test computes the truth rather than asserting a string against itself |
| F1 | Four dialogs moved from `w-[min(Xrem,100vw-2rem)]` to `w-[Xrem] max-w-[calc(100%-2rem)]` — a percentage on a fixed element resolves against the viewport *without* the scrollbar |
| F2 | `--gutter-l` / `--gutter-r` in `index.css`, `max(1rem, env(safe-area-inset-*))` growing to `1.5rem` at `sm`. Adopted by the header, the drawer and the lightbox |
| F3, F4, F5, F20, F21, F22 | Seven ramps now have their own `sizes`: `content`, `article`, `productCard`, `relatedCard`, `newsCard`, `galleryTile`, `carouselCard`, `half`, `lightbox` |
| F8 *(pulled forward)* | Seven targets at 36–40 px raised to 44 px. Pulled into R1 because the G3 invariant is worth more enforced from the start than deferred — R3 and R6 no longer carry it |

**Measured effect of the `sizes` correction** (requested px → rendered px):

| Grid | 1024 | 1920 | Was |
|---|---|---|---|
| Catalogue card | 312 → 312 | 293 → 293 | 256 → 312 *(18 % under)*, 480 → 293 *(64 % over)* |
| Related card | 229 → 229 | 293 → 293 | 256 → 229, 480 → 293 |
| News card | 309 → 309 | 395 → 395 | 256 → 309, 480 → 395 |
| Gallery tile | 315 → 315 | 296 → 296 | 256 → 315, 480 → 296 |
| Article cover | 976 → 976 | 720 → 720 | 1024 → 976, **1280 → 720** *(78 % over)* |

**Not done, deliberately:** the 25 content containers still write `px-4 sm:px-6`
rather than the gutter property. Adopting it there is a layout change at every
width and belongs with R2 and R7, which is where the gutter itself changes.

**Still unverified:** G1, G2 and G4 are manual gates. Nothing in R1 could check
them, so they remain open until the sweeps in later phases.

419 tests (418 pass, 1 opt-in live skip), 0 lint errors, build clean.

---

### Phase R2 — Close the 768–1024 gap · *large* — ✅ **done**

**Why second:** the largest single source of "not perfect", and it touches the
most files, so everything after it is tuning rather than restructuring.

* Give every grid a real `md:` step: home sections, `StatsBand`, `UspStrip`,
  `Footer` (**F15**), `ContactPage` (**F14**), `PageBlockSection`, the About
  foundations row, `Certifications`.
* Audit all 81 `sm:` rules and decide, one at a time, whether each belongs at
  `sm` or at `md`. Several are tablet rules mislabelled as phone rules.
* Fix the two fixed-track grids that squeeze at 1024 (**F14**).

**Done when:** 768 px has its own layout on every page — not a stretched phone
and not a shrunken desktop — and G2 passes at 768 and 1024.

---

#### R2 — completed 2026-09-17

Breakpoint usage, before and after:

| Prefix | Before | After |
|---|---|---|
| `md:` 768 | **6** | **12** |
| `lg:` 1024 | 58 | 55 |
| `xl:` 1280 | 8 | 11 |

**Given a 768 layout**

| | Was | Now |
|---|---|---|
| Stats band | 2×2 until 1024 | four across from 768 — the comp's single row, and it fits in 720px |
| Catalogue | two 350px cards | three 227px cards |
| Gallery masonry | two 352px tiles | three 229px tiles |

**Two structural fixes**

* **F14 — the contact map.** At 1024–1279 the grid is two columns and there are three panels, so the map wrapped into the second row *under the detail card* and rendered **304px wide** — too narrow to read a street name on. It now spans the row until there is a third column to put it in.
* **F15 — the footer.** Five blocks in three columns is a full row and then two stranded ones, which reads as a mistake rather than a layout. Each step now divides the five evenly: the brand block takes a row of its own until all five fit beside it.

**Two found while working**

* `Certifications` went 3-up straight to 5-up, squeezing each mark to **182px** at 1024. Four first, five at 1280.
* The home page's skeleton drew a two-column grid where the real band is a horizontal scroll strip until `lg` — so the page jumped when the data arrived, which is the one thing a skeleton exists to prevent.

**Ten grids were looked at and deliberately left at their 640 layout**, each with its reason recorded in `NO_768_STEP` in the test. Four USPs across 720px is 146px each with a 44px icon beside the text; four footer link lists leaves the newsletter's email field about 110px wide; a field pair is two fields, and a third column would break the pairing.

A new test asserts that **every responsive grid in the tree appears in one list or the other** — so the next person can tell "decided" from "never got to it", and a new grid that nobody has ruled on fails the suite.

**Deferred, not forgotten:** the product detail page (its related-products grid and the gallery/buy-panel split) is Phase R5's, and its 768 layout is still the 640 one.

**Still unverified:** G1, G2 and G4 remain manual. R2 changed what 768 and 1024 draw, and nothing here can tell you it *looks* right.

423 tests (422 pass, 1 opt-in live skip), 0 lint errors, build clean.

---

### Phase R3 — Header, drawer and footer · *medium* — ✅ **done**

The chrome is on every page, so its defects are every page's defects.

* Header: resolve the 1024–1150 squeeze between wordmark, nav and CTA (**F7**).
  Decide the ramp explicitly rather than letting `truncate` absorb it.
* Drawer: width at 320 px, safe-area insets, scroll with a long menu, target
  sizes (**F8**).
* Footer: the column ramp from R2, plus link target spacing and the legal row
  wrap at 360 px.
* All chrome targets to 44 px (**F8**, G3).

**Done when:** G2 and G3 pass on the header, drawer and footer at all five
widths plus landscape.

---

#### R3 — completed 2026-09-17

**F7 — the header squeeze.** At 1024 the eight nav links take about 550px and
the full CTA another 150px, leaving the logo around 227px; at `lg:text-lg` the
name truncated to "RAJDHANI FOOD PRO…". A brand name cut mid-word is worse than
a brand name two points smaller, so:

* the wordmark holds at 16px until `xl` (`sm:text-base xl:text-lg`), and
* the CTA is its phone icon alone between 1024 and 1280, taking its label back
  at `xl`. It keeps a 44px target from `w-11`, and the label is `sr-only`
  rather than `hidden` — still announced, just not drawn. The comps only cover
  ~1536px, so this fills a width they never described rather than changing one
  they did (D5).

**The drawer**

* `pt-[env(safe-area-inset-top)]` added — it touches the top edge as well as the
  right and bottom, and in landscape on a notched phone its header sat under the
  notch.
* Category rows went `py-2` → `py-3`: 14px text in 16px of padding is a **36px**
  row, on the one surface that is only ever used with a thumb.
* Confirmed already right: `w-80 max-w-[85%]` (272px on a 320px phone, not the
  whole screen), and `min-h-0 flex-1 overflow-y-auto` so a long menu scrolls
  inside the panel instead of pushing the CTA off the end.

**The footer**

* Links were a bare **20px** line of text with rows 10px apart — under the
  relaxed 24px floor in 2.5.8, and the 24px circles overlapped. `inline-block
  py-1` takes each to 28px and the list gives back the same 8px from its gap, so
  the rhythm on screen is unchanged and only the hit area moved.
* Adopted the safe-area gutter from R1, and a bottom inset of
  `max(1.25rem, env(safe-area-inset-bottom))` on the last row of the page — what
  a home indicator sits over.

Eight new invariants, including that the CTA keeps its accessible name when it
loses its label, and that the wordmark still gives way before the nav does.

**Still unverified:** G2 and G4 are manual, and the header ramp is the change
most worth looking at — the arithmetic above says the wordmark now fits at 1024,
but arithmetic on text width is an estimate, and the site name comes from the
API and can change.

431 tests (430 pass, 1 opt-in live skip), 0 lint errors, build clean.

---

### Phase R4 — Hero and the scrolling strips · *medium* — ✅ **done**

The most-seen component on the site, and the one with the smallest targets.

* Hero height for short and landscape viewports (**F10**).
* Carousel dots to a real target size without changing how they look (**F9**) —
  a padded hit area around an 8 px dot, not a bigger dot.
* Swipe on touch, and move the arrows off the headline on a phone (**F11**).
* The four horizontal strips: a visible scroll affordance, snap behaviour,
  keyboard reachability, and an edge fade so a cut-off item reads as *more*
  rather than as *broken* (**F12**).

**Done when:** a slide is fully visible at 640×360, every carousel control meets
G3, and each strip shows that it scrolls without being told.

---

#### R4 — completed 2026-09-17

**F10 — the hero height.** A flat `32rem` is 512px, more than the whole viewport
of a phone held sideways. `--hero-min` caps it against the viewport height, so
nothing shortens where it already fitted. `svh` rather than `dvh` deliberately:
the dynamic unit changes as the browser hides its own chrome, so a `dvh`-sized
hero grows and shrinks under the reader as they scroll.

**F9 — the dots.** The button is now a 44px target and the span inside it is the
8px dot the comps draw. Growing the dot itself to meet 2.5.8 would have changed
the design; padding it does not.

**F11 — the arrows, and one found with them.** The side arrows sat at `top-1/2`
over a headline that is full width on a phone, so on the screens where they
mattered most they covered what they pointed at. All the controls are now one
row at the bottom. While moving them: the USP strip is pulled up 48px over the
hero and carries `z-10`, so **the dots at `bottom-6` were rendering behind it** —
invisible on any site with more than one banner. They sit at `bottom-16` now.

**Swipe**, in about ten lines and no dependency (D3). Pointer events rather than
touch events, so a stylus works too, and a mouse drag is ignored — that is a
selection, not a swipe. The judgement lives in `swipeIntent`, which is pure:
a tap is a drag of two or three pixels, and without a floor every tap on the
hero advanced it; a flick down the page is mostly vertical, and a few pixels of
horizontal wobble must not move the slide under someone's thumb.

**F12 — the four strips.** Each now fades at whichever edge has more behind it,
driven by `useScrollEdges`. Two of the four hid the scrollbar outright, and on a
touch device there is no scrollbar to see in any case — overlay scrollbars
appear once you are already scrolling, which is after you needed to know. The
arithmetic is pure and has the off-by-one worth testing: on a fractional-pixel
display a fully scrolled strip reports a `scrollLeft` a shade under its maximum,
and a fade that never clears reads as content that can never be reached.

**Found while verifying the build: the stylesheet was being built from the notes
about it.** Tailwind v4 scans the project for class names and cannot tell a
class from a string that looks like one. `plan.md` quotes the classes it argues
about and these tests assert on them by name — so every class this work
*removed* was still being compiled and shipped. `min-h-[32rem]` was still in the
bundle after nothing referenced it. Two `@source not` rules; **0.9 kB**, and it
was growing with each phase.

Also: the home skeleton reserved a fixed `32rem` where the real hero is now
viewport-capped — the same shape mismatch fixed for the featured strip in R2.

461 tests (460 pass, 1 opt-in live skip), 0 lint errors, build clean.

**Still unverified:** the swipe threshold (48px) and the fade width (2.5rem) are
judgement calls that want a real thumb on a real phone. G2 and G4 remain manual.

---

### Phase R5 — Content pages · *medium* — ⚠️ **findings done, sweep not**

Page by page, against the matrix: Products, Product Detail, Gallery, News,
News Article, About, Quality, Contact, Dealer, Legal, Home.

* Product detail: gallery and buy panel at 768, pack-size chips wrapping, the
  quantity stepper and price row at 360.
* Gallery masonry at 320–420 px (**F16**).
* Prose measure on every long-form page (G7).
* Empty, loading and error states at 360 — they are laid out for a desktop card
  and have never been checked narrow.

**Done when:** every route passes G1, G2, G4 and G7 at all five widths.

---

#### R5 — completed 2026-09-17

**The product page splits at 768**, deferred here from R2. Stacked, a tablet got
a 720px square image above the price — below the fold on the one page whose job
is to show it. Three consequences, all of them the interesting part:

* Its image now has its own ramp. `SIZES.half` promises the full 720px below
  1024; the product image actually draws **344** at 768, so sharing that value
  would have been 109% over.
* `gridSizes` learned a **per-step gap**: the page tightens from `gap-14` to
  `gap-8` at 768, and one number for the whole ramp is wrong on one side of it.
* The highlights row inside the panel now ramps **2 → 4 → 2 → 4**. That is not a
  mistake: the panel is full width until 768 and *half* of one after, so its
  width is not monotonic. Four highlights across the 344px panel is 86px each.

**F16 — the masonry at 320.** Two columns of a 288px content width is a 136px
tile. One column below 360 now, which is the only width that changes.

**A third `sizes` mismatch, found here.** `BulkSupplyCta` takes 1.2 of a 2.2fr
split — not half, not all — and was being given `SIZES.half`, which promises the
full width below 1024: **92% over at 768**. It has its own value now.

**Targets and narrow states.** The quantity stepper was a pair of 40px buttons
around a 40px field. Empty and error cards carried `p-10`, which leaves 248px of
a 360px phone and 208px of a 320px one before the border. A rescan confirms
**no button, link or dialog close anywhere in the tree is now under 44px**.

**G7 across every long-form surface**, not just the two the R1 test named: the
article, the legal pages, page blocks, the product tabs and the product
description all cap their measure.

Breakpoint usage, start of R2 to end of R5: `md:` **6 → 17**, `xl:` **8 → 15**.

470 tests (469 pass, 1 opt-in live skip), 0 lint errors, build clean.

**Corrected 2026-09-17, after the phase was questioned.** It was marked done;
it should have carried the same warning R8 does.

Every *finding* assigned to R5 was done — F16, F25, F26, the stepper, the
empty-state padding, G7. What was not done is the first line of the scope:
"page by page, against the matrix". Two things were missing.

* **Six of the eleven pages were never read.** About, Quality, Contact, Dealer,
  Home and News Article got no narrow-width review; the phase fixed the findings
  it already had and stopped. Reviewed now: all six are clean — no fixed widths,
  no `whitespace-nowrap`, and the `minmax(0, …)` tracks on Contact and Quality
  are exactly what stops a grid blowing out. **One thing was wrong**: the Quality
  assurance panel was `p-8` with no narrow step, taking 64px off a 328px phone,
  where every other card on the site starts at `p-6`. Fixed, and a test now
  looks for the pattern everywhere.
* **Two items in the scope were reasoned about and never asserted** — the pack
  chips and the price row. Both were in fact fine, and both now have the test
  that should have accompanied the claim.

**Still unverified, and this is the part that cannot be closed here:** the
matrix half of "page by page" is the manual sweep, the same one R8 could not
perform. G1, G2 and G4 stay open. The product page at 768 is the first thing to
look at — R5 changed the busiest page on the site at a width nobody has seen.

---

### Phase R6 — Overlays, forms and inputs · *small* — ✅ **done** *(completed 2026-09-17 after review)*

* Height caps and internal scroll on the four uncapped dialogs (**F13**).
* On-screen-keyboard behaviour: a focused field must not end up under the
  keyboard on a phone.
* Form controls: 44 px minimum, label and error wrapping at 360, the honeypot
  staying off-screen at every width.
* Lightbox controls at 360 and in landscape.

**Done when:** every dialog fits and scrolls at 640×360, and G3 passes on all
form controls.

---

#### R6 — completed 2026-09-17

**F13 — the media dialogs were sized by width alone.** A 16:9 box 608px wide is
342px tall and a square one is 608; neither fits a 640×360 phone held sideways,
and neither could scroll to reveal the rest. The fix is not a scrollbar — a
picture you have to scroll is not a picture you can see — but a second
constraint: multiply the vertical space available by the aspect ratio and that
is the widest the box can be and still fit.

    w-[min(60rem,calc((100dvh-2rem)*16/9))]   the video
    w-[min(56rem,calc(100dvh-2rem))]          the square zoom

**Both close buttons came inside the frame.** `-top-12` floats the control 48px
clear of the dialog, and on a short viewport there is no 48px to be clear into —
the button that closes a dialog is the last one that may be off-screen. Inside,
they sit over a video or over a product shot on white, so they are `bg-ink/70`
with backdrop blur rather than surface-coloured, which would vanish against the
second. A test now forbids `-top-12` anywhere in the tree.

**The lightbox.** A fixed 3:2 box `w-full` was 405px tall on a 640px screen —
half again as tall as a landscape phone, with the caption below that. The media
area flexes and the caption row does not, so the picture is always as large as
fits and never larger. `min-h-0` is the part that is easy to leave out and
without which a flex child cannot shrink below its content at all. The black
panel behind it went too: letterboxing against the overlay's own dark ground is
invisible, where a black box around a portrait image is not.

**A fourth `sizes` mismatch.** The zoomed product image was given
`SIZES.content`, which promises the whole 1232px container for a dialog capped
at 896.

**The on-screen keyboard.** A browser brings a focused field into view by
scrolling it to the very edge of its scroll container, which inside a dialog on
a phone cuts the field's label off above it — you can see what you are typing
but not what you are typing into. `scroll-mt-6` reserves the label's height.

**Checked and already correct:** every form control is `h-11` or `h-12`, and all
three honeypots are pulled *left* off-screen rather than right, so they cannot
widen the document. Both now have tests, because the next person adding a form
will copy one of these.

479 tests (478 pass, 1 opt-in live skip), 0 lint errors, build clean. Lightning
CSS pre-evaluates the aspect arithmetic to `min(60rem, 177.778dvh - 3.55556rem)`
in the built output, which is the same constraint.

**Finished 2026-09-17, after R5's review prompted the same read of this phase.**
Two of the four scope lines had been half-answered.

**The keyboard bullet was solved for one form out of three.** `scroll-mt-6` went
on the enquiry dialog's fields and nowhere else — but the mechanism is not
particular to dialogs. A browser scrolls a focused field flush to the top of its
scroll container; on a *page* that container is the document, and the top of the
document is behind a 4rem sticky header. So tabbing to a field on the contact or
dealer form, or failing validation and having React Hook Form focus the first bad
one, put it **under the header**, where the error explaining the problem is the
part you cannot see. One base rule on `input, select, textarea` covers every
form on the site, present and future; the dialog's tighter utility still wins
inside it, which is the layering that makes both right.

The clearance is now `--scroll-offset`, read by that rule *and* by `prose.js`'s
anchored headings — the header's height was two numbers and is now one.

**Two more scope items were reasoned about and never asserted** — label and error
wrapping at 360, and the lightbox controls at 360 and in landscape. Both are in
fact correct (no `truncate` or `nowrap` on any label or error; both lightbox
arrows are 44px inside the frame from the narrowest screen, and the caption is
`min-w-0 truncate` against a `shrink-0` counter). Both now have the test that
should have come with the claim.

499 tests (498 pass, 1 opt-in live skip), 0 lint errors, build clean.

**Still unverified:** iOS does not shrink `dvh` when the keyboard opens, so the
keyboard case wants a real phone. G1, G2 and G4 remain manual — R8's job.

---

### Phase R7 — Large screens: 1440 and 1920 · *medium* — ✅ **done**

D2's brief, made concrete.

* A `2xl:` tier (**F18**): gutter, section rhythm, grid steps where a fifth
  column genuinely helps.
* The type ramp above `sm:` (**F17**) — headings currently stop scaling at
  640 px.
* Hero and `PageHero` heights at 1920.
* Re-run G5 once the large-screen ramps are settled, since `sizes` depends on
  them.

**Done when:** 1920 reads as a large screen rather than as 1280 with dead space,
and 1440 and 1920 are visibly distinct from 1280.

---

#### R7 — completed 2026-09-17

**The two numbers the design system owns were declared and read by nothing.**
`--space-section` (80px / 48px) and `--container-max` (1280px) have been in
`tokens.css` since the start, with a comment saying they are "read by
arbitrary-value utilities" — and no utility read either. Every band spaced
itself by hand and every container capped itself by hand, so the section rhythm
lived in twenty-five places and could not be changed at all.

Both are now real: **24 containers** and **10 gutters** adopted the properties,
and every band reads the rhythm.

**That is what gives 1920 its own layout.** Under D2 the container stays capped,
so a wide screen cannot be given more width — what it can be given is air:

| | ≤768 | 768–1535 | ≥1536 |
|---|---|---|---|
| `--space-section` | 48px | 80px | **112px** |
| `--hero-min` | 32rem | 38rem | **44rem** |

**F18 is satisfied without a single `2xl:` in the JSX**, which is the right
shape: the tier is three lines in one stylesheet rather than scattered variants.
`sm:` usage fell 86 → 58 and `lg:` 52 → 46 as the system replaced per-component
breakpoints.

**G8 finally reached the content.** R1 adopted the safe-area gutter in the
chrome and left the containers for here, so until now a notched phone in
landscape clipped the first 44px of every *page* — the logo was safe and the
first column of every grid was not. The two sticky filter bars bleed to the page
edge and re-pad, so they take the negative of the same property: if the
container grew for a notch and the bar did not, they would come apart by the
inset, visible as a step in the border.

**F17 — examined and rejected.** The finding claimed 1440 and 1920 "get
phone-tablet type". They do not: headings stop scaling at 640 but they stop at
**36px**, which is a desktop size and already matches the comps. Growing it
further at 2xl would move *away* from the approved design, which D5 forbids.
The one apparent inconsistency — `PageHero`'s h1 reaches 48px where the
catalogue and news h1s stop at 36 — is two treatments, not a mistake: one sits
on an image band and the other on white.

**F24 twice more.** A JSDoc comment in `cloudinary.js` and a CSS comment in
`tokens.css` each *named the class they were explaining the removal of*, and
Tailwind compiled both straight back into the bundle. A test now forbids it.

**G5 re-checked.** The ramps did not move, and the gutter property resolves to
the same 16/24px it replaced. On a notched phone in landscape the inset wins and
the real content is up to 56px narrower than `sizes` assumes — about 9% on a
640px screen, inside tolerance, and in the safe direction.

486 tests (485 pass, 1 opt-in live skip), 0 lint errors, build clean.

**A question for the client, not a defect.** At 1920 the content is 1280 with
320px of gutter each side. That follows D2 and every band's *background* is
full-bleed, so it reads as bands rather than a floating box — but the comps are
proportional (content ≈ 84% of the export width), which at 1920 would be ~1610.
If a wider column is wanted at 1920, it is now **one number** in `tokens.css`
rather than twenty-five edits. Raising it is a visible change at 1440 and 1920,
so it is D5's "raise it, do not do it".

---

### Phase R8 — Verification and sign-off · *small* — ⚠️ **half done**

* Full sweep: 320, 360, 414, 768, 1024, 1280, 1440, 1920, plus 640×360 and
  812×375 landscape.
* 200 % zoom and 400 % zoom reflow (G4).
* `prefers-reduced-motion` across the carousel, the count-up and every
  transition added in R4.
* Keyboard traversal of every page at 360 px, where focus order and scroll
  containers interact worst.
* Record the results in this file, and open a ticket for anything found that is
  a design question rather than a defect (D5).

**Done when:** all eight gates pass on every route, and this file carries the
dated matrix that says so.

---

#### R8 — 2026-09-17: the automatable half is done, the sweep is not

**I cannot sign this phase off.** G1, G2 and G4 are defined in §1 as manual
gates, and no browser is available in this environment — no extension, no
headless runner, no rasteriser. Every phase has said so at its close. Claiming a
sweep I did not perform would be the one thing that makes the rest of this
document untrustworthy.

So R8 delivered two things instead.

**1. The checks that never needed a browser — all passing.**

| | Result |
|---|---|
| `prefers-reduced-motion` | One global reset in `tokens.css` kills every animation and transition, including the carousel, the hover scales and the skeleton pulses. `animation-iteration-count: 1` is there too — without it a pulse at `0.01ms` runs forever |
| The one JS animation | `useCountUp` asks `matchMedia` itself, because a stylesheet cannot stop it, and shows the final value rather than nothing |
| Positive `tabindex` | None anywhere. The only values are `-1` on three honeypots and a roving tablist |
| Scrollable regions | Every strip holds links or buttons, so Tab reaches the content; the one prose panel carries `tabIndex={0}` explicitly |
| Visible focus | `:focus-visible` outlines in the brand colour, site-wide |

Seven new invariants lock all of it.

**2. `tests/viewport-audit.js` — the sweep as an instrument.**

Paste it into DevTools and call `audit()` at each width in §6. It reports, for
the current viewport:

* whether the page scrolls sideways at all, **and which elements do it** —
  ignoring anything legitimately inside a horizontal scroller (G1)
* every interactive target under 44px, with its accessible name (G3)
* every line of body text running past 75ch (G7)
* every image with no reserved box (G6)

It reads and writes nothing, so it is safe on production. It is pasted by hand,
never imported — a test asserts no source file references it — and it lives in
`tests/`, which Tailwind is told not to scan, so nothing in it can compile
itself into the stylesheet.

**What it still cannot tell you** is whether the result *looks* right. A layout
can pass all four checks and be ugly at 768. The instrument finds the defects;
the design needs an eye.

**What is left, in the order I would do it**

1. `audit()` at 320, 360, 768, 1024, 1440, 1920 and 640×360 on each route in §6.
2. The product page at 768 — R5 changed the busiest page at a width nobody has
   looked at.
3. The header between 1024 and 1280 — R3's arithmetic says the wordmark now
   fits, but text-width arithmetic is an estimate and the site name comes from
   the API.
4. The swipe threshold (48px) and the strip fade (2.5rem) — judgement calls that
   want a real thumb.
5. 200% and 400% zoom, which no static check reaches.
6. The container width at 1920 — a question, not a defect. See R7.

---

## 5. Sequencing

```
R1 ──> R2 ──> R3 ──┐
                   ├──> R7 ──> R8
       R4 ─────────┤
       R5 ─────────┤
       R6 ─────────┘
```

R1 and R2 are strictly first. R3, R4, R5 and R6 are independent of each other
and can be reordered if something urgent surfaces. R7 depends on the ramps that
R2, R3 and R5 settle. R8 is last by definition.

---

## 6. Width matrix

**Not filled in.** Phases R1–R7 are complete and their static gates pass, but
the matrix records a *manual* sweep and no browser was available to perform one
(see R8). It is left empty on purpose: a matrix of ticks nobody put there would
make every other claim in this document worth less.

To fill it: run the site, paste `tests/viewport-audit.js` into DevTools, and
call `audit()` on each route at each width. Mark a cell **ok**, or write what
broke.

| Route | 320 | 360 | 768 | 1024 | 1440 | 1920 | 640×360 |
|---|---|---|---|---|---|---|---|
| `/` | | | | | | | |
| `/products` | | | | | | | |
| `/products/:slug` | | | | | | | |
| `/gallery` | | | | | | | |
| `/news` | | | | | | | |
| `/news/:slug` | | | | | | | |
| `/about` | | | | | | | |
| `/quality` | | | | | | | |
| `/contact` | | | | | | | |
| `/dealer` | | | | | | | |
| `/privacy`, `/terms` | | | | | | | |

---

## 7. Out of scope

* Any change to what the site looks like at a width it already handles (D5).
* The admin dashboard — it is a desktop tool and has its own standard.
* API or content changes. Where a section is empty because its endpoint does not
  exist yet (RTPP-67), its *layout* is still checked using the shape it will
  have.
* Performance work beyond the `sizes` correction in R1.

---

*Written 2026-09-17. Audit evidence in §2 is against the tree as of that date;
re-run the greps in §2.1 before starting a phase if the tree has moved on.*
