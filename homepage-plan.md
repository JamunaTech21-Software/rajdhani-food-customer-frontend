# Home page — reference alignment plan

**Reference:** `c:\Users\ACTIVE\Desktop\Rajdhani-website\Rajdhani Home.png`
**Target:** `/` — `src/pages/HomePage.jsx` and `src/components/home/*`
**Written:** 2026-09-20. No code changed.

---

## 0. How this was checked

Three sources, not one:

1. **The reference image**, band by band, top to bottom.
2. **The current code** — `HomePage.jsx` and all seven band components, plus
   `ProductCard`, `FeatureItem`, `ProcessTimeline` and `BulkSupplyCta`.
3. **The live API**, because a difference caused by missing *content* needs a
   different fix from one caused by missing *code*, and from the screen alone
   they look identical. Everything below marked **[data]** was confirmed by
   calling the endpoint, not assumed.

That third step changed two conclusions, so it was worth doing — see F1 and F3.

### Band order

| # | Reference | Today |
|---|---|---|
| 1 | Hero | Hero ✅ (light, dark text) |
| 2 | USP strip (overlapping card) | USP strip ✅ |
| 3 | Our Premium Tea Range | FeaturedProducts ✅ |
| 4 | **About Us + stats, one band** | One band ✅ (text half awaits content) |
| 5 | **From Garden To Your Cup** | Built ✅ |
| 6 | **Become Our Distributor / Dealer** | Built ✅ |
| 7 | **Testimonials \| News, side by side** | Side by side ✅ |
| 8 | Footer | Footer ✅ |

Four of the eight bands differed structurally and two did not exist at all.
**All eight are built.** Row 4 renders its counters today and gains its text
half the moment a `(home, welcome)` block is written — see F3.

---

## 1. Decisions needed before any code is written

These are yours, not mine. Everything in §3 assumes an answer; where I have a
recommendation it is marked.

### D1 — Does this image supersede the earlier comps?

Eleven code comments across the home components cite "the approved comp" as the
reason for a specific choice — the single-banner hero with no controls, the USP
strip straddling the hero edge, the scroll-strip product carousel. This new
reference contradicts some of them.

I need to know whether this image **replaces** the earlier sign-off or is one
more opinion beside it. If it replaces it, those comments must be rewritten as
they change, or the next person reads a justification for something that is no
longer true. **Recommendation: treat it as superseding, and say so in the
comments as each is touched.**

### D2 — Is the reference authoritative on *content*, or only on *layout*?

The reference shows copy the database does not contain: six products where the
API returns five, three news posts where one is published, stats reading
"Distributors / Happy Customers" where the live rows read "Dealers Nationwide /
Districts Covered". **[data]**

Two readings:

* **Layout only** — build the shapes, let whatever is published flow in. The
  page then never matches the image exactly, and that is correct.
* **Content too** — the gaps in §4 become tickets for the client and the
  backend before this page can look like the picture.

**Recommendation: layout only, and treat §4 as a separate content list.** A
front-end that hardcodes the reference's copy to match a screenshot is a front
end that ignores the CMS it was built around.

### D3 — Hero: does the dark scrim go?

The reference hero has **no dark overlay**. The headline is near-black on the
bright left third of the photograph, with "Perfect Taste" in brand green.

Today `Slide` paints `bg-ink` at the banner's `overlay_opacity` (live value:
40 **[data]**) and forces `text-ink-inverse` with a gold highlight. Dropping the
scrim is not a CSS tweak — it moves the contrast guarantee from *the code* to
*whoever uploads the next banner*. A dark headline over a dark photograph is an
AA failure the admin can cause with one upload, and the overlay is what stops
that today.

Three options:

| | Behaviour | Cost |
|---|---|---|
| **a** | Keep the scrim, keep light text | Nothing to do; does not match the reference |
| **b** | Honour `overlay_opacity: 0` and add a per-banner light/dark text switch | Needs an admin field the API does not have |
| **c** | Drop the scrim on the home hero only, keep light text elsewhere | Matches the image; AA depends on the uploaded image |

**Answered 2026-09-20, and by none of the three.** See H8: the scrim is
inverted and localised — a light wash behind the text only — so the reference
is matched, legibility stays in the code, and no backend field is needed.

### D4 — Products: real carousel buttons, or keep the scroll strip?

The reference draws circular prev/next buttons flanking the track. Today it is a
native scroll container — which gives keyboard scrolling, touch momentum and
correct focus behaviour for free, all of which a button-driven carousel has to
reimplement.

**Recommendation: keep the native scroller and add the buttons as controls over
it**, scrolling by `scrollBy`. That is a small addition, not a rewrite, and it
keeps everything the native container already does right.

### D5 — What happens to the video promo?

The live hero banner carries a `video_url` **[data]**, and `WelcomeBlock` has a
`PromoCard` that opens it in a modal. **The reference has no video anywhere.**
Either it moves somewhere, or `PromoCard` becomes dead code. Worth asking the
client rather than deciding silently.

---

## 2. Findings

Grouped by what kind of work each one is. **[data]** = confirmed against the
live API.

### Missing bands

**F1 — "From Garden To Your Cup" is absent, and it is no longer blocked.**
`HomePage.jsx` carries this in its docblock:

> One band of the signed-off design is still absent: "From Garden To Your Cup"
> needs `ProcessStep`, which has admin routes but no public endpoint.

**That comment is stale.** RTPP-67's backend update shipped the endpoint.
`GET /public/process-steps?group=FROM_GARDEN_TO_CUP` returns **five published
steps** today — "Carefully Sourced", "Graded and Sorted", "Blended", "Tested",
and a fifth — each with a title, a description and an `icon_name` **[data]**.
The group name in the API's own validation enum is literally `FROM_GARDEN_TO_CUP`,
which is the reference's heading.

This is the largest single gap: a whole band, unblocked, with content waiting.

**F2 — The Dealer / Distributor CTA is absent from the home page.**
The `DEALER_CTA` banner exists and is populated: "Interested in a dealership?" /
"We are expanding across all 64 districts." / "Apply for Dealership" → `/dealer`
**[data]**. `BulkSupplyCta` already renders it on `/products`.

But it renders it as a **pale card with an image-left split**, and the reference
draws a **full-width dark green bar** — round white icon, heading and subcopy on
the left, one button hard right. Reusing the component as-is would put a
different-looking band on the home page from the one in the picture. See H5 for
how to share the data without sharing the layout.

### Layout differences

**F3 — The About Us band renders nothing at all.**
`WelcomeBlock` returns `null` without a block, and `/public/home` returns
`welcome: null`; `/public/page-blocks/home` returns `[]` **[data]**. So the band
is invisible on the live site right now — not mislaid, *empty*. This is a
content gap (§4), not a code one.

**F4 — About Us and the stats are one band in the reference, two today.**
The reference puts the text and button on the left and the four stats on the
right of a **single pale-green section**, divided by a vertical rule. Today
`WelcomeBlock` (white ground, text + image/promo) and `StatsBand`
(`bg-ground-warm`, four stats across full width) are separate full-width
sections. Merging them changes where `StatsBand` may be used — the About page
renders a second one from group `ABOUT`, so it cannot simply become
home-specific.

**F5 — Testimonials and News share one row in the reference.**
Roughly one third / two thirds. Today they are two stacked full-width bands and
testimonials sits on a tinted ground. This is the most invasive layout change on
the page, because both components currently own their own `<section>`, ground
colour and container.

**F6 — Testimonials is a single-quote carousel in the reference.**
One card, dot pagination beneath, no star rating, no heading beyond the eyebrow.
Today: a three-up grid of cards, each with a star rating, under an h2 reading
"Trusted across Bangladesh". Three testimonials are published **[data]**, so the
dots would show three.

**F7 — Two headings in the reference are eyebrow-only.**
Reference: "WHAT OUR CLIENTS SAY" and "LATEST NEWS & UPDATES" with nothing
under them. Today both carry an invented h2 ("Trusted across Bangladesh", "From
the garden and the factory"). Removing them is a **document-outline change**, not
a cosmetic one — see R3.

**F8 — The product carousel has no visible controls.**
See D4. Reference also shows six cards; five are published **[data]**.

### Component detail

**F9 — The hero.** Covered by D3. Beyond the scrim: the reference shows **two**
CTAs ("Explore Our Products", "Download Catalogue" with a download glyph) and
**no eyebrow**. The live banner has one CTA, no secondary, and an eyebrow reading
"PREMIUM QUALITY TEA" **[data]**. `Cta` already switches to a download glyph for
`/downloads/*` URLs, so the second button needs data, not code.

**F10 — The product card is a different card.**
Reference: image on a pale panel, name, **one-line tagline**, "View Product →".
No border, no badge, no wishlist heart.
Today: bordered card, badge chip, wishlist heart, two lines of
`short_description`, "View Details →".

Note the API returns a `tagline` field — `"Bold. Dark. Traditional."` — that
**no card renders** **[data]**. *(Corrected 2026-09-20: an earlier draft of this
line said nothing rendered it at all. It is rendered, on the product detail
page, at `BuyPanel.jsx:26`. It was never on the card.)* That is exactly the
one-liner the reference draws, and `short_description` is the longer sentence
beneath it.

**Do not remove the wishlist heart to match the picture.** It is RTPP-69, it is
shipped, and the reference predates it. Flag it to the client instead.

**`ProductCard` serves three surfaces** — the home carousel, `/products`, and
the related-products row on the detail page. Only the home one was redesigned,
so "match the reference's card" is either a variant or a change to three pages.
*(Decided 2026-09-20: home carousel only, via a variant.)*

**F11 — The USP strip has no dividers.**
Reference draws a vertical rule between each of the four. Also: the reference
icons are **pale tinted** circles; live `icon_bg_color` is `#1B5E20`, solid dark
green **[data]**, so the real page renders four dark discs where the picture
shows four pale ones. That is content, not code — `FeatureItem` already computes
a readable glyph colour for whatever is set.

**Built 2026-09-20, in the audit rather than in a phase — F11 was recorded as
a finding and then never assigned to one. `lg:divide-x lg:divide-line`, and
`lg` only: at `sm:grid-cols-2` the third item *starts* a row, and `divide-x`
skips only the first child, so a rule there would be drawn down the middle of
nothing.**

**And the marks, 2026-09-20.** The line above called the dark discs "content,
not code", which was wrong twice over. Setting `icon_bg_color` to a pale green
would have given a pale disc with a **near-black** glyph, because `readableOn`
picks ink or white — the reference wants a *green* glyph, which no data change
reaches. `FeatureItem` gained a `tint` tone instead: the editor’s colour
becomes the glyph and `shade(colour, 0.93, 0.33)` the wash, which reproduces
`--color-brand-tint` from `--color-brand` to within one hex digit. Below WCAG
1.4.11’s 3:1 the glyph falls back, so a pale editor colour cannot make the mark
invisible. Quality and the dealer benefits keep the filled disc.

**F12 — The process step is drawn differently from `ProcessTimeline`.**
Reference: a small circular icon, a **dotted connector line** between steps, a
title and two lines of description. No step numbers.
Today: a 4:3 image-or-icon tile, a numbered badge, chevron separators.
The reference also bleeds a photograph off the **right edge** of the band, which
`ProcessTimeline` has no concept of.

`ProcessTimeline` is shared with About and Quality, so it cannot simply be
restyled — see H4.

**F13 — News cards show no excerpt in the reference.** Today there is a
three-line clamp. One-line change, but it is a deliberate density choice worth
confirming.

### Already correct — leave alone

* **Header.** Nav items, order, and the "Get In Touch" pill with its phone glyph
  all match. It is a `tel:` link, which is right.
* **Footer.** Five columns, social circles, the inline newsletter field with its
  arrow button, and the bottom bar with Privacy Policy / Terms — all match.
* **The USP strip straddling the hero edge.** Already done, via `-mt-12` and
  `z-10`.
* **Stats presentation** — icon above, large brand-green number, label beneath.
  Matches; only the band it lives in changes (F4).

---

## 3. Phases

Ordered so the visible gaps close first and the risky structural work comes
after. Each is independently shippable.

### H1 — "From Garden To Your Cup" ✅ *done 2026-09-20*

Add the band the reference shows and the API already serves.

* ✅ New `src/components/home/ProcessBand.jsx` — icon row with dotted
  connectors, per F12.
* ✅ `HomePage` fetches `useProcessSteps("FROM_GARDEN_TO_CUP")`, merged into the
  payload object as `process_steps` so every band still reads one object.
  It *is* a second request, so RTPP-59's "everything from one `/public/home`"
  is now almost true rather than true — nothing waits on it and the page still
  paints in one round trip. **Asked of the backend: fold the group into
  `/public/home` and the criterion is exact again, and that merge line is the
  only thing that goes.**
* ✅ Added to `SECTIONS` between stats and testimonials, so it keeps RTPP-72's
  per-band error boundary.
* ✅ Stale "still absent / no public endpoint" paragraph removed.
* ✅ `SIZES.processPhoto` added; `ProcessBand` registered in
  `responsive.test.mjs`'s decided set (R2); 12 tests added.

#### H1a — the tea-picker photograph *(2026-09-20)*

The band's right-edge image from the reference, supplied as
`home-our-process-right.png` and copied into `static/` for the same reason the
About watermark was: `public/` is not Vite's public directory and is
gitignored.

A plain `<img>`, `object-cover`, bleeding to the right edge. **Content left,
photograph right, from `lg`.** Lazy, since the band is fifth on the page.

It waited for `xl` at first, which was wrong for a reason that is easy to
miss: `xl` is 1280 **CSS** pixels, and Windows display scaling at 125–150%
puts a 1900-pixel window at 1267–1520 CSS px. A scaled laptop could land just
under the breakpoint and see **no photograph at all** — which is what
happened.

**And the geometry that reserved room for it was wrong.** The first attempt
held the text off with `lg:pr-[32%]` — but **percentage padding resolves
against the containing block**, which here is the full-bleed section, not the
1280-capped container. So it was 32% of the *viewport*: 614px at 1920. The
five steps were crushed to 104px and a 281px gulf opened between them and the
photograph, which is what "the image is out of the section" was describing.

Both halves are now measured from the container:

* the text is held off by `max-width` on a child —
  `lg:max-w-[calc(100%-18rem)]`, `xl:max-w-[calc(100%-24rem)]` — and a
  percentage `max-width` *does* resolve against this container's content box;
* the photograph's width is `calc((100vw - min(100vw,1280px))/2 + 22rem)`,
  which is the margin outside the capped container plus how far it reaches
  back inside it.

The result is a **constant 56px gap at every width from 1024 to 2560**, with
the photo always reaching the viewport edge and each step 125–150px. A test
walks all seven widths and fails if the gap moves at all. Below `lg` the
photograph is hidden and the steps take the full width.

**Real alt text, unlike the About band's watermark.** That one is an ornament
and takes `alt=""`; this is a photograph of someone picking tea, and it says
something the five steps beside it do not — where the leaves come from and who
picks them. An empty alt is right for a border flourish and wrong for this.

The unused `image` prop and `SIZES.processPhoto` are gone: the photo is a
fixed asset, not a field, because `ProcessStep.image` is per-step and the
banner placement enum has no `HOME_PROCESS`. One line to change if a CMS
source is ever added.

**The photograph fades in from its left edge.** The reference does not butt
the white section against the photo — it resolves out of the background over
roughly a quarter of its width, and a hard edge there reads as a screenshot
pasted onto the page. `.fade-in-from-left` in `index.css`, beside
`.scroll-fade`, which is the codebase's existing home for mask rules and
already records why the `#000` in a mask is not a colour §18.2 governs.

**Five corrections after looking at the reference band close up:**

1. **`object-right`.** The column is portrait at `xl` — about 419×479 — and
   the source is 1942×809, so `cover` scales to the height and keeps only 36%
   of the width. Centred, that is x=32%–68% of the photograph; **the picker is
   at x=64%–100%**, so the subject was cropped out entirely and the band showed
   blurred bushes. A test recomputes that 36% so the anchoring cannot be
   dropped by accident.
2. **The mark is white inside a green ring**, not a filled mint disc. It was
   `bg-brand-tint` with `ring-brand/10`, so the outline was invisible and each
   step read as a soft blob rather than as a mark sitting on the line that runs
   through it. The fill still has to be opaque — it is what stops the dotted
   rule showing through.
3. **The connector is green.** `border-line-strong` made it a neutral hairline
   that looked like a table rule; in the reference it reads as part of the
   marks it joins.
4. **The description is a size down from the title** (`text-xs`). At the same
   size the two ran together and the row read as five paragraphs rather than
   five labelled marks.
5. **Step 2 is `sprout`, not `droplet`** — the reference draws two leaves on a
   stem there. Changed in the admin, not in code.

**Measured here and acted on later, site-wide — see H9.** The reference's
bands are roughly half the height of ours. Shrinking one band would have made
it inconsistent with the seven around it, so it waited until the client asked
for the whole page.

#### H1b — it was the content all along *(2026-09-20)*

Five rounds of CSS changes went into making this band match, and the band kept
not matching. **The difference was never the CSS.** Side by side:

| # | Reference | What was published |
|---|---|---|
| 1 | Carefully Plucked · "Finest tea leaves hand picked" | Carefully Sourced · "Leaves selected from estates in Sylhet and Moulvibazar." |
| 2 | Hygienic Processing · "Advanced technology ensures purity" | Graded and Sorted · "Every lot is graded by leaf size and appearance before it is accepted." |
| 3 | Quality Checked · "Multiple level quality testing" | Blended · "Our blenders build each product to a fixed profile, batch after batch." |
| 4 | Fresh Packaging · "Sealed to retain freshness & aroma" | Tested · "Samples are cupped and lab-tested against the batch specification." |
| 5 | Perfect Taste · "Pure, natural & refreshing" | Packed and Sealed · "Sealed in moisture-proof packaging the day it is blended." |

Five identical `leaf` icons against five distinct ones, and descriptions two
to three times longer — full sentences that wrap to five or six lines in a
140px column. No arrangement of the layout was going to reconcile that.

Updated in the admin, with the client's agreement, to the reference's copy and
five semantic icons: `leaf`, `droplet`, `shield-check`, `package`, `coffee`.

**Worth saying plainly: the copy that was there was better.** "Leaves selected
from estates in Sylhet and Moulvibazar" names real places; "Finest tea leaves
hand picked" is comp filler. The *icons* and the *length* had to change — five
leaves is a bug and long sentences break the column — but the wording is a
content decision and the previous text is one admin edit away if the client
prefers it.

**The lesson for the rest of this plan:** when a band "does not look like the
reference", check the data before the CSS. §0 says exactly that and I did not
follow it here.

**Also surfaced by H1, and still in §4:**
2. **Nothing supplies the right-edge photograph.** `ProcessStep.image` is
   per-step and the reference's is band-level; the banner placement enum has no
   `HOME_PROCESS`. The component takes an optional `image` prop and is passed
   none, so the five steps take the full container — which at five across is
   the better use of the width anyway. It will match the reference the moment
   a source exists.

**Deliberately not done:** `ProcessTimeline` was left alone. About and Quality
draw the same payload as numbered cards with 4:3 tiles and chevrons; one
component with a variant flag would make every future change to either page
reason about the other. The shared thing is the payload. See H4.

### H2 — Product card and carousel ✅ *done 2026-09-20*

* ✅ `ProductCard` gained a `variant`. `compact` — no border, centred, one line
  of `tagline` (falling back to `short_description`), "View Product →" — is
  used **only by `FeaturedProducts`**. `/products` and the related row keep
  `default` untouched.
* ✅ Prev/next controls per D4: `scrollBy` over the existing native scroller,
  so keyboard scrolling, touch momentum and focus behaviour are all kept.
  Step measured from the first card plus the computed `column-gap`, not
  assumed. Faded out at each end rather than removed, so neither moves.
* ✅ `behavior: "smooth"` is conditional on `prefers-reduced-motion` — a
  `behavior` passed to `scrollBy` overrides the CSS that would have respected
  it.
* ✅ Wishlist button and badge kept in both variants (R6, confirmed).
* ✅ 14 tests added.

**The change that was not in the plan, and had to be:** the strip used to
become a **four-column grid from `lg`**. Two problems with leaving that:

1. The arrows the reference draws are shown on exactly those screens, and
   would have had nothing to scroll.
2. With five products published, `lg:grid-cols-4` put the fifth alone on a
   second row — a live defect, not a hypothetical one.

So the strip now scrolls at every width. Consequences handled: `SIZES.carouselCard`
was two conditions describing that grid and is now a flat `240px` (R1); the
`HomePage` skeleton mirrored the grid and now mirrors the strip; the
`NO_768_STEP` reason was rewritten.

#### H2a — the strip, corrected against the reference *(2026-09-20)*

Three changes asked for after looking at the comp at 100%:

* **No edge fade.** `scroll-fade` is off this strip. The other three keep it;
  this one has arrows that say the same thing outright, and the reference
  shows clean card edges. The thin scrollbar stays **below `xl`**, where the
  arrows do not exist — dropping both would leave a row that scrolls with
  nothing at all saying so. A test holds it to that bargain.
* **Six across from `xl`**, as the reference draws. The track is
  `calc((100%-100px)/6)` — a fraction of the strip, not a fixed width, because
  the arrows take 44px each out of the row and a hardcoded card width would be
  silently wrong the moment that changed.
* **Arrows outside the cards.** They were absolutely positioned and flush with
  the container edge, overlapping the outermost card — the compromise H2 took
  to avoid hanging past the container and giving the page a horizontal
  scrollbar (G1). They are now **flex siblings** of the strip, so they take
  their own width, sit in the margin beside the cards exactly as the reference
  draws, and neither problem can occur. `min-w-0` on the strip is what lets it
  shrink inside that row; without it six tracks report their content width as
  a minimum and shove the right-hand arrow off the container.

`SIZES.carouselCard` follows: `(min-width: 1280px) 170px, 240px`. The 170 is
arithmetic, not a guess — container 1232, less two 44px arrows and two 12px
gaps, leaves 1120; less five 20px gaps, over six tracks. A test recomputes it,
so changing the arrow size or either gap fails loudly.

Verified in the built CSS that the `xl` track and the hidden scrollbar both
land inside `@media (width >= 80rem)` rather than applying everywhere.

**Still open:** `SIZES.carouselCard` overstates the track if the catalogue ever
drops to a handful of featured products, where the tracks stop overflowing and
stretch. Eight are published, so it is right today.

### H3 — Dealer CTA band ✅ *done 2026-09-20*

* ✅ New `src/components/home/DealerCta.jsx` — the reference's solid brand bar:
  round white mark, heading and subcopy, one button hard right.
* ✅ Reads the **same `DEALER_CTA` banner** `BulkSupplyCta` reads, under the
  **same query key** `/products` uses, so the two share one cache entry.
* ✅ `BulkSupplyCta` untouched. Two presentations of one payload; the shared
  thing is the data, not the layout.
* ✅ Every word a visitor reads is the banner's, including the heading — the
  reference words it "Become Our Distributor / Dealer" and the live record says
  "Interested in a dealership?", and per D2 the database wins.
* ✅ 10 tests added. Registered in `NO_768_STEP` for its `lg:flex-row` (R2).

**Note on the request count.** This is the **third** query on the home page,
after H1 made it two. Nothing waits on either and both are cached, so the page
still paints on the home payload alone — but RTPP-59's "everything from one
`/public/home`" is now plainly not literal, and the `HomePage` docblock says so
rather than pretending. The backend ask in §4 now covers both.

**Content note:** the banner has no `desktop_image`, and the reference's leaf
motif on the right of the bar has no data source. Left out rather than faked.

### H4 — Process step presentation

Only if H1 revealed that the reference's step style should also apply to About
and Quality.

* Add a `variant` to `ProcessTimeline` (`"numbered"` today, `"connected"` for
  the reference) rather than forking the component.
* Leave About and Quality on `"numbered"` unless the client says otherwise.

### H5 — About Us + stats merge ✅ *done 2026-09-20*

* ✅ New `src/components/home/AboutBand.jsx`: `PageBlockBody` left, the
  counters right, one `bg-ground-warm` ground, rule between them at `lg`.
* ✅ `Stat` extracted from `StatsBand` and shared; the *band* stays, because
  the About page renders a second one from group `ABOUT`.
* ✅ 8 tests added.

**"Blocked on content" was half right, and the half it got wrong mattered.**
The band is not invisible — `welcome` is null but **four stats are published**,
so a naive merge that required both halves would have *removed a working
section from the live page*. `AboutBand` renders whichever half it has: today
the counters alone across the band, exactly as before; the two-column
reference layout the moment someone writes the welcome block, with no code
change. The split and the rule are applied only when both halves are present,
because a rule down the middle of a half-empty band looks like a bug.

**This phase orphaned `WelcomeBlock`, and that is D5.** `AboutBand` took its
place, so nothing renders it — and nothing renders its `PromoCard`, the only
consumer of the `HOME_VIDEO_CARD` placement. The file is **kept, unrendered,
with a note at the top** rather than deleted: the reference has no video
anywhere, but deleting the only consumer of a placement the admin still offers
would answer an open client question by default. D5 decides whether the video
moves somewhere or the placement goes with the file.

**Note:** `block.image` is ignored here. The reference gives the right column
to the numbers, and About and Quality still draw that field, which is where it
is actually used.

#### H5a — the leaf watermark *(2026-09-20)*

The band's background from the reference: pale tea leaves bottom-left and
top-right, behind everything. A plain `<img>`, absolutely positioned, `alt=""`
and `aria-hidden` — decoration, contributing no layout, so it cannot shift the
text as it arrives. Lazy, because the band is the fourth on the page;
`bg-ground-warm` stays underneath so the band is the right colour before the
leaves land, which is nearly invisible since the artwork's base tone is within
a shade of the token.

**The file had to move, and that is not cosmetic.** It was pointed at as
`public/RajdhaniPagesRequireImages/home/home-about-us.png`, and **`public/` is
not Vite's public directory here** — `publicDir: "static"`, set during the
Vercel work because the two comp folders under `public/` were 162 MB and were
being copied into every build. That directory is also **gitignored**, so a
reference to it would have worked on one laptop and 404'd everywhere else,
including production. Copied to `static/home-about-us.png`; the source folder
is untouched.

`tests/deploy.test.mjs` asserted `static/` held exactly one file and that
`index.html` referenced it. Its intent — nothing rots there unreferenced — is
right and is kept; it now scans `src/` as well, since an asset may reasonably
be referenced from a component.

**Outstanding, and it is now the biggest thing on the page — see below.**

---

### The static PNGs are 4.2 MB of a 4.9 MB build

A launch blocker in everything but name, and nothing in the code can fix it:

| File | Size | What it is |
|---|---|---|
| `home-our-process-right.png` | **2.29 MB** | A photograph. Should be ~150 KB |
| `home-distibutor-right.png` | **1.40 MB** | Flat green with leaves. Should be ~80 KB |
| `rajdhani-logo.png` | **1.12 MB** | A logo drawn at 28–40 px |
| `home-about-us.png` | **833 KB** | Flat, near-white artwork. Should be ~50 KB |

**5.6 MB of PNG on one page**, and three of the four are flat artwork that
compresses to almost nothing.

No image tooling is available in this environment — `cwebp`, `magick` and
`sharp` are all absent, and the `convert` on `PATH` is Windows' disk utility —
so I cannot convert them here. Two ways out, in order of preference:

1. **Put them through Cloudinary**, which the project already uses for every
   other image. `cloudinaryUrl()` adds `f_auto,q_auto`, so the browser gets
   AVIF or WebP automatically and `CloudinaryImage` adds a responsive
   `srcset` on top. The admin has `POST /admin/media` and a
   `/media/signature` endpoint already. This is the architecture the rest of
   the site is built on and these three are the only images outside it.
2. **Replace the files in `static/` with WebP** and update the three `src`
   strings. Cruder, no responsive variants, but it is ten minutes and takes
   roughly 4.2 MB to under 300 KB.

The logo is the worst of the three in proportion: 1.12 MB to draw a 40 px
mark, and it has been that way since the branding work.

### H6 — Testimonials as a carousel ✅ *done 2026-09-20*

* ✅ One quote at a time with dot pagination, replacing the three-up grid.
  Three are published and they are very different lengths; a row of three gave
  none of them the width to be read.
* ✅ `advance()` and `swipeIntent()` reused from `lib/carousel.js`, unchanged.
  A mouse drag is excluded — across a paragraph that is a text selection.
* ✅ No autoplay, and nothing animates, so there is no reduced-motion branch to
  get wrong.
* ✅ Each dot is a 44px button around an 8px mark, named "Show testimonial 2 of
  3", with `aria-current`. The `<blockquote>` is keyed on the testimonial so
  the element is replaced rather than mutated — otherwise a screen reader is
  never told the text under its cursor changed.
* ✅ 10 tests added.

**F7 resolved for this band, and not the way the plan assumed.** The plan said
"eyebrow only", which would have left a `<section>` with no accessible name
(R3). Instead the **eyebrow is now the `<h2>`**, styled as an eyebrow. The
invented line under it — "Trusted across Bangladesh", written here rather than
by anyone who owns the copy — is gone, the reference's visible design is
matched, and the outline survives with no hidden duplicate for a screen reader
to read twice. H7 should do the same to the news band's "From the garden and
the factory".

#### H6a — the card, corrected against the reference *(2026-09-20)*

* **Pale panel, no shadow.** It was `bg-surface shadow-card` — white on a
  white band, reading as a card only because of the shadow. The reference
  draws a quiet `bg-ground` panel.
* **No stars**, at the client's request. `rating` is still set on every row
  and still returned by the API; it is simply not drawn.
* **No rule above the attribution**, and the name carries the reference's
  en-dash — `aria-hidden`, so a screen reader is spared "en dash Ahmed
  Hossain".
* **Dots centred** under the card.

**Intermediate state:** the quote is capped at `max-w-2xl` and sits alone on
the left of a full-width band, which looks sparse. That is what H7 fixes by
moving it into a third of the row beside the news. Worth knowing before anyone
looks at the page between the two phases.

**Housekeeping:** `Testimonials.jsx` no longer has a responsive grid, so its
now-meaningless entry in `responsive.test.mjs`'s decided set was removed.

### H7 — Testimonials and News side by side ✅ *done 2026-09-20*

* ✅ New `src/components/home/VoicesBand.jsx` owns the container, the rhythm
  and the split. `Testimonials` and `LatestNews` dropped all three and became
  column contents.
* ✅ News band's invented h2 removed, eyebrow promoted to the heading — the
  same fix H6 made to the quotes.
* ✅ Excerpt dropped from the home news card (F13); `/news` keeps it.
* ✅ 9 tests added, including one that recomputes the 249px from the gaps, so
  changing either gap fails loudly rather than silently mis-sizing the image.

**Three corrections to what this phase assumed.**

1. **The plan said the news cards go "three-across to one-across".** They do
   not — the reference keeps all three side by side inside the two-thirds
   column. Re-read from the image before building.

2. **The split is at `xl`, not `lg`.** Three cards inside two thirds of a
   1024px container are 192px each, too narrow for a cover, a date and a
   two-line title; dropping to two there would wrap the third onto its own row
   beside a single quote, which reads as a bug. At 1280 the container caps, so
   the news column is a constant 795px and the card a constant 249px — the
   width the reference actually draws. Below `xl` both stack and keep the
   full-width layouts they already had.

3. **`SIZES.newsCard` was not "recalculated" — a second entry was added.**
   `/news` still draws that card at 395px and the home page now draws it at
   249px, so one string could not serve both: sharing it would have been 59%
   over on the busiest route. `homeNewsCard` differs from `newsCard` **only**
   in its top step, and a test asserts every step below it is identical, so
   the two cannot drift apart by accident.

**One thing this phase had to add.** Merging two bands into one row would have
merged their error boundaries, so a bug in a news cover would have taken the
quotes down with it — the exact failure RTPP-72 added them to prevent. Each
column keeps its own boundary, and `ErrorBoundary` gained an `inline` prop:
inside a laid-out column, its default fallback would have applied the page's
gutters a second time.

### H8 — Hero ✅ *done 2026-09-20*

Unblocked by the client choosing "match the reference".

* ✅ Headline `text-ink` with the highlight in `text-brand`, subtitle
  `text-ink-muted` — it was white over gold on a 40% `bg-ink` scrim.
* ✅ Second CTA is the reference's white button with a border and dark text,
  not the translucent one (which only read because the image was darkened).
* ✅ Slider controls and dots turned dark, and the active dot is brand rather
  than gold — a white chevron over a bright tea garden is a control nobody
  can see. They do not render today (one banner), but they were wrong.
* ✅ No image now falls back to `bg-ground`, not `bg-brand-deep`.
* ✅ 8 tests added.

**D3 is answered, and not by any of the three options I offered.** All three
were wrong in the same way: (a) ignores the reference, (b) waits on a backend
field, (c) hands legibility to whoever uploads the next photograph. A dark
headline over a dark upload is an AA failure nobody notices until it is live.

The scrim is **inverted and localised** instead — a light wash fading left to
right, behind the text only, leaving the product shot on the right untouched.
That is what the reference's own photograph happens to provide with its pale
misty left third; doing it in CSS means every future upload gets it too. No
backend change needed, and D3's option (b) is no longer required.

`overlay_opacity` still drives it, so the admin's slider still means something
— now "how much protection does this image need" rather than "how dark" —
**with a floor of 0.8**. An editor may add protection; they may not remove it.

**Not touched:** `PageHero`, the *other* seven pages' hero, which keeps its
dark overlay and light text. The reference covers the home page only, and a
test pins that it was not dragged along.

**One deviation from the reference, and it is data:** the live banner has an
eyebrow ("PREMIUM QUALITY TEA") where the reference shows none. It now renders
in brand green rather than gold so it belongs on a light hero.

#### H8a — the second hero button *(2026-09-20)*

Asked for "Download Catalogue" beside "Explore Our Tea". **The slot already
existed** — `Cta` has always rendered `secondary_cta_label`/`secondary_cta_url`
— and both fields are null on the live banner, so nothing drew. It was a
content gap wearing the costume of a missing feature.

**The button always renders, always reads "Download Catalogue", and now
actually downloads one** — a `.csv` of every published product, built in the
browser on the click. The banner's own `secondary_cta_*` pair still wins where
an editor has written one.

*(This went through three shapes first: an uploaded PDF that did not exist, a
hidden button, then a button that said "Download" and navigated to
`/products`. Generating the file removes every one of those compromises —
nothing to upload, nothing to relabel, and the verb is true.)*

**Client-side, because there is no export endpoint.** `/public/products/export`,
`/public/products.csv` and `/public/export/products` all 404 **[data]**. If one
is ever added, `lib/catalogue.js` is what it should agree with.

**The API caps `limit` at 100 and does not say so.** Ask for 500 and the
response comes back with `limit: 100` and `totalPages` computed against it — so
a single request would have shipped a silently truncated catalogue the day the
client published their 101st product, with nothing about the file looking
wrong. `fetchAllPages` walks the pages, with a `maxPages` guard so a bad
`totalPages` cannot spin against a live API.

**Three things the file gets right that are easy to miss:**

* **Formula injection.** Excel and Sheets *evaluate* a cell beginning with
  `=`, `+`, `-`, `@` or a tab. These values come from a CMS an editor types
  into, so a product named `=HYPERLINK(…)` would run on the machine of whoever
  opens the file. Guarded with a leading apostrophe — inside the quoting, not
  after it. Numbers are exempt, so a negative price stays a number.
* **A byte-order mark.** Without it Excel reads UTF-8 as the system code page
  and every Bangla character, curly apostrophe and `৳` sign arrives as
  mojibake.
* **CRLF**, per RFC 4180, since Excel on Windows is the likeliest reader.

**Columns** are the list endpoint's fields: product, category, tagline,
description, price, was, discount, badge, rating, reviews, page URL, image
URL. **Pack sizes and SKUs are not included** — they live only on
`/public/products/{slug}`, so they would cost one request per product. Agreed
as out of scope; that is where they come from if the client wants them later.

An unrated product has a **blank** rating rather than a zero, so a reader
averaging the column is not dragged down by products nobody has rated — the
same reasoning as the Product JSON-LD omitting `aggregateRating`.

Verified end to end against the live API: 8 products, BOM present, and the
comma in *"ginger, cardamom and cinnamon"* correctly quoted rather than
splitting the row. 26 tests in `tests/catalogue.test.mjs`.

`Cta` also learned to tell a file from a route: the glyph and the new tab are
driven by an explicit flag now, because a resolved download's URL is on
Cloudinary and looks nothing like the `/downloads/…` path the old sniff
expected.

#### H3a — the leaves on the bar *(2026-09-20)*

`home-distibutor-right.png` is the whole bar background — flat green on the
left, tea leaves on the right — but the two shapes are nothing alike: **the
bar is about 9.6:1 and the image 1.56:1**. Stretched across, `cover` would
crop it to a 16% horizontal sliver and the leaves would be unrecognisable
mush.

So it occupies the **right 36%** instead, where `cover` keeps 45% of the
image's height and the leaves fall over the right fifth of the bar — where the
reference puts them. `lg:pr-44` holds the button clear of them; without it the
CTA lands on top.

`fade-in-from-left` is reused here, and it does a second job beyond softening
the edge: **the image's green and `--color-brand` are not the same green**,
and the fade means they never have to be. A hard join would show a seam, and a
worse one the day someone changes `primary_color`. `bg-brand` stays underneath
as the real background, with the image as decoration over it.

---

**No content is needed for the catalogue button.** The catalogue is generated from
whatever is published, so it works today and keeps working as the range grows.
The `product_catalogue` download key is no longer used by the home page.

---

## 4. Content gaps — not code

None of these can be fixed in this repo. Collect them into an RTPP ticket.

| Gap | Effect | Owner |
|---|---|---|
| **No `(home, welcome)` page block [data]** | **The About band shows its four counters and nothing else** — the eyebrow, heading, paragraph and "Learn More About Us" button in the reference are all that block. Still empty as of 2026-09-20. This is the last thing between the home page and the comp | Client / RTPP-86 |
| ~~No `product_catalogue` download row~~ | **No longer a gap** — the hero generates the catalogue as a `.csv` from whatever is published (H8a). Nothing to upload | — |
| Hero has no secondary CTA **[data]** | Only relevant if the button should read something other than "Download Catalogue" | Client |
| No dealer-brochure download row | The product page's brochure button stays hidden | Client |
| ~~USP `icon_bg_color` is `#1B5E20`~~ | **Fixed in code, not content** — the strip tints it (F11). No admin action needed | — |
| ~~One news post published~~ | **Fixed** — three published 2026-09-20 with covers on Cloudinary (H7a) | — |
| Five featured products **[data]** | Five cards, not six | Client |
| Stat labels differ from the reference **[data]** | "Districts Covered" vs "Happy Customers" | Client |
| `promo_banner` empty **[data]** | No promo card — moot if D5 removes it | Client |
| ~~All five `FROM_GARDEN_TO_CUP` steps use `icon_name: "leaf"`~~ | **Fixed in the admin** (H1b) — now `leaf`, `droplet`, `shield-check`, `package`, `coffee`, and the copy shortened to the reference's | — |
| No source for the process band's right-edge photograph | The band renders five steps full-width instead | Backend + client (H1) |

**Ask of the backend (Samin):**

1. Fold the `FROM_GARDEN_TO_CUP` steps **and the `DEALER_CTA` banner** into
   `/public/home`, so the home page is one request again (H1, H3). The page is
   on three queries now. **Raised — the two merge lines in `HomePage` are the
   only things that would need removing.**
2. A `HOME_PROCESS` banner placement, or a group-level image on
   `/public/process-steps`, for the photograph in H1's band.
3. A `text_theme` or equivalent on the banner, if D3 lands on option (b).

---

## 5. Risks, and what not to break

**R1 — `SIZES` is derived, not hand-written.** `lib/cloudinary.js` computes each
entry from a column ramp. Any band that changes column count — H7 certainly,
H2 possibly — must update its ramp there, not paste a `sizes` string into the
component. `tests/responsive.test.mjs` gate G5 checks this to ±15%.

**R2 — the 768 rule.** Every new responsive grid must either carry an `md:`
step or be added to `NO_768_STEP` in `tests/responsive.test.mjs` **with a
reason**. New components in H1, H3 and H5 will all trip this.

**R3 — removing the two h2s changes the document outline.** After F7 those bands
become `<section>`s with no accessible name. Either keep an `sr-only` h2 or move
to `aria-label`. Do not just delete them.

**R4 — §18.2: no component may hardcode a colour.** The reference's pale-green
About ground and dark-green dealer bar must both resolve to existing tokens. If
neither `bg-ground` nor `bg-ground-warm` nor `bg-brand-deep` is right, add a
token to `shared/theme/tokens.css` — do not write a hex. A lint rule enforces
this.

**R5 — the boundaries must survive.** Every band is wrapped individually by
`SECTIONS` in `HomePage.jsx` (RTPP-72). New bands go into that list, not beside
it, or they lose their boundary.

**R6 — the wishlist heart (F10) and the star ratings (F6) postdate this
reference.** Do not remove shipped features to match an older picture. Confirm
with the client first.

**R7 — do not run Prettier on these files.** There is no Prettier config in this
repo; running it reformats whole files at the wrong print width and buries the
real change.

---

### H9 — the page's vertical rhythm ✅ *done 2026-09-20*

The page read as nearly twice as tall as the comp, and two tokens accounted
for almost all of it.

**`--space-section` is half a gap, not a gap.** Adjacent bands each contribute
their own padding, so what a visitor sees between two sections is twice the
number. At the old 80px that was 160px between every pair, and **800px down
the page** against roughly 300px in the comp. Now 32 / 48 / 64px, so the gap
is 64 / 96 / 128px and the budget is 480px at desktop.

**`--hero-min` was the single largest remaining piece.** 608px at 1280 against
the comp's ~474px. Now 30 / 34 / 38rem. It is still a *minimum*, so a longer
headline grows the hero rather than being clipped — and a test asserts the
`lg` step clears the ~477px the content needs, because a step below that would
make the value inert and the ramp a lie.

| Viewport | Rhythm | Gap between bands | Hero |
|---|---|---|---|
| 360–640 | 32px | 64px | 480px |
| 768–1279 | 48px | 96px | 480px |
| 1280–1535 | 48px | 96px | 544px |
| 1536+ | 64px | 128px | 608px |

**384px shorter at 1280, 576px shorter at 1536 and up**, on the home page
alone. Both tokens are site-wide, so every other page tightens with it —
which is the point: a rhythm that applies to one page is not a rhythm.

Nothing needed changing in the eighteen components that read the tokens. That
is what they were extracted for in phase R7, and `ProcessBand`'s photograph —
which aligns itself with `top-(--space-section)` — followed the new value on
its own.

---

### H10 — the footer ✅ *done 2026-09-20*

Four differences, and this time they were **measured off the comp rather than
eyeballed**: a small PNG reader (inflate the IDATs, undo the row filters,
sample pixels) turned each question into a number. Section 0 of this plan says
check the data before writing CSS; reading the pixels is the same idea applied
to the design.

| | Was | Comp | Now |
|---|---|---|---|
| Gap above the footer | `mt-16` **plus** the band's own padding | none — the footer butts straight against the section above | no margin |
| Band padding | `py-14` | ~22px top, ~16px bottom | `py-(--space-section)` |
| Background | `bg-brand-deep` `#0d3411` | `#015826` | `bg-brand` `#1b5e20` |
| Column rules | none | 3 hairlines at ~white/12 | `border-ink-inverse/15` from `lg` |
| Legal rule | full-bleed | x=72→949 of 1024 — the content box | inset to the container |
| Subscribe button | gold, 8px gap | green, welded to the field | `bg-brand`, joined |

**The footer is the brand green, not the deep shade.** The comp's footer and
its dealer bar sample within a few points of each other, and both are the
brand green. `brand-deep` is a visibly different, much darker band. Both
shades are still rewritten from `site_profile` at boot, so §18.2 holds either
way.

**The three column rules are asymmetric, and that is deliberate.** They fall
between Quick Links | Products, Products | Contact and Contact | Newsletter —
there is none between the brand block and Quick Links. `divide-x` would have
drawn all four, so the rule goes on the three columns that want it.

Two tricks keep them from moving anything. `-ml-5 pl-5` widens the column 20px
to the left and pushes its content back by the same 20px, so the line centres
in the existing `gap-10` gutter instead of sitting flush against the text —
`pl-10` alone would have doubled the gutter and squeezed every column.
`-my-(--space-section) py-(--space-section)` does the same vertically so the
rule runs the full height of the band, as the comp draws it, and only from
`xl`, because that is the first step where all five blocks share a row.

**The newsletter is one control, not two.** A white pill with the green button
welded to its right edge. The wrapper owns the radius, the white and the
clipping, which means the input can no longer draw its own focus ring inside
it — `overflow-hidden` would eat half of it — so the ring moves to the wrapper
via `focus-within`. That collided with an existing invariant in
`layout.test.mjs` that forbade `outline-none` anywhere in the chrome. The rule
was right in spirit and too blunt in letter: it now allows a removal only
where a replacement ring is asserted in the same control. The button stays
44px square, which `responsive.test.mjs` enforces.

**Not changed, and why.** The comp's brand column carries a logo mark above
the wordmark. `static/rajdhani-logo.png` is colour type 2 — RGB with **no
alpha channel at all** — on a white background, so dropping it into a green
footer renders a white rectangle. `site.logos.dark` is still a placehold.co
placeholder. The text wordmark stays until a dark-background or transparent
variant is uploaded in admin; that is one upload, not a code change.

**Content, not code.** The comp's copyright reads "© 2025 Rajdhani Food
Products. All Rights Reserved. Developed by Jamuna Tech." and
`site.footer.copyright` is "© 2026 Rajdhani Food Products. All rights
reserved." One admin edit if the client wants the credit line.

**Padding is deliberately looser than the comp.** The comp's footer band is
~22px top and ~16px bottom at 1280-equivalent, against 48px here. Our columns
are taller than the comp's anyway — 44px social buttons and `py-1` link rows
are the WCAG 2.5.8 target, not decoration — and a footer on a different
rhythm from every other band is a worse trade than 30px of air.

---

## 5a. Audit, 2026-09-20

Asked after H5 whether the home page was finished. It was not, and mapping
every finding to a phase is what showed it:

| Finding | Phase | State |
|---|---|---|
| F1 process band | H1 | ✅ |
| F2 dealer bar | H3 | ✅ |
| F3 About band empty | H5 | ✅ code; content outstanding |
| F4 About + stats merge | H5 | ✅ |
| F5 side by side | H7 | ✅ |
| F6 quote carousel | H6 | ✅ |
| F7 eyebrow headings | H6, H7 | ✅ |
| F8 carousel controls | H2 | ✅ |
| F9 hero | H8 | ✅ built after this audit |
| F10 product card | H2 | ✅ |
| **F11 USP dividers** | **none** | ✅ built in this audit |
| F12 process drawing | H1 | ✅ |
| F13 news excerpt | H7 | ✅ |

**F11 was never assigned to a phase.** Thirteen findings, eight phases, and
one finding fell between them — the plan's own fault, not the implementation's.
Built now.

**One defect the phases introduced.** `DealerCta` carried
`pb-(--space-section)` while every band around it carries `py`, so the bar had
one section of space above it and two below — visibly off-centre between the
process band and the quotes. It now has no vertical padding of its own and
sits in its neighbours', which is symmetric and matches the reference's
tighter bar. A test derives the rule from `SECTIONS` so a new band cannot
quietly skip its rhythm.

**Still not verified in a browser.** No browser tooling in this session.
Everything above is source assertions and one check of the built CSS (the
`lg:divide-*` rules were confirmed to sit inside `@media (width>=64rem)`, and
`@source not "../*.md"` was confirmed still to keep this file's class names
out of the bundle). Nobody has looked at the page.

---

## 6. Suggested sequencing

| Order | Phase | Why here |
|---|---|---|
| 1 | H1 Process band ✅ | Whole band missing, content ready, nothing else touched |
| 2 | H3 Dealer CTA ✅ | Same — additive, content ready |
| 3 | H2 Product card + controls ✅ | Visible, self-contained |
| 4 | H6 Testimonials carousel ✅ | Self-contained |
| 5 | H5 About + stats merge ✅ | Moves working code; blocked on content |
| 6 | H7 Side-by-side row ✅ | Most invasive; touches `SIZES` |
| 7 | H8 Hero ✅ | Was blocked on D3; answered by inverting the scrim |
| 8 | H9 Page rhythm ✅ | Site-wide; waited until the client asked for the whole page |
| 9 | H10 Footer ✅ | Last band on the page; measured off the comp's pixels |
| 10 | H4 Process variant | Only if the client wants it on About and Quality too |

H1 and H3 together close both missing bands and need no decisions from anyone.
They are the sensible first commit.

---

## 7. Note on this file

Keep it in `frontend/customer/`. `src/index.css` carries
`@source not "../*.md"`, which stops Tailwind scanning markdown in this
directory for class names — without it, every class quoted above would be
compiled into the production bundle, including ones the work removes. Moving
this file elsewhere would reintroduce that.
