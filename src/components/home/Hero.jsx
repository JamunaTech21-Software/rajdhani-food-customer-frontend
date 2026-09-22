import { ArrowRight, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router";

import { CloudinaryImage } from "../CloudinaryImage.jsx";
import { cn } from "../../lib/cn.js";
import { advance, swipeIntent } from "../../lib/carousel.js";
import { SIZES } from "../../lib/cloudinary.js";
import { isExternal } from "../../lib/nav.js";

function Cta({
  label,
  url,
  onClick,
  busy = false,
  variant = "primary",
  download = false,
}) {
  if (!label || (!url && !onClick)) return null;

  const className = cn(
    // 44px is the floor `responsive.test.mjs` enforces, so the height holds
    // and the padding gives instead: "Explore Our Products" plus its arrow is
    // 158px at 12px type in a 196px column, and 204px at the full size.
    "inline-flex h-11 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-medium transition-colors duration-(--duration-fast) sm:h-12 sm:gap-2 sm:px-6 sm:text-sm",
    variant === "primary"
      ? "bg-brand text-on-brand hover:bg-brand-dark"
      : /*
           A ghost button: no fill, a green hairline and a green label, which
           is what the reference draws for "Download Catalogue".

           H8 called this a solid white button. That was read off the picture
           rather than measured, and it was wrong. Sampling the comp down the
           button at x=300 gives #e6dfb3, #e4deb1, #dad4a2, #d2d19d — the same
           gradient as the hillside above and below it, so the photograph
           shows straight through. The border sits at x=239 and samples
           #78946d, which is the brand green at about 60% over that pale
           ground.

           It stays legible because the wash behind the text column does, and
           that has a floor: an editor may add protection, not remove it.
         */
        "border border-brand/60 bg-transparent text-brand hover:bg-brand hover:text-on-brand",
  );

  // A download gets a download glyph rather than an arrow: the reference puts
  // "Download Catalogue" beside "Explore Our Products", and the two should not
  // look like the same kind of action. Passed explicitly rather than sniffed
  // from the path, because a resolved download's URL is on Cloudinary and
  // looks nothing like `/downloads/…`.
  const Glyph = download || /^\/downloads\//.test(url) ? Download : ArrowRight;

  const content = (
    <>
      {label}
      <Glyph size={16} strokeWidth={2} aria-hidden='true' />
    </>
  );

  // A button, because building the file *is* the action — there is no URL to
  // link at. `aria-busy` rather than `disabled`: a disabled control loses
  // focus mid-interaction, which drops a keyboard user out of the hero.
  if (onClick) {
    return (
      <button
        type='button'
        onClick={onClick}
        aria-busy={busy || undefined}
        className={className}
      >
        {content}
      </button>
    );
  }

  if (isExternal(url)) {
    return (
      // A new tab for a real file, as the product page's brochure link does: a
      // PDF replacing the page a visitor was reading loses their place, and
      // Back from a downloaded file does not always return them.
      <a
        href={url}
        {...(download
          ? { target: "_blank", rel: "noopener noreferrer" }
          : null)}
        className={className}
      >
        {content}
      </a>
    );
  }
  return (
    <Link to={url} className={className}>
      {content}
    </Link>
  );
}

/**
 * The second button beside "Explore Our Tea" — the reference's "Download
 * Catalogue".
 *
 * **It always renders, and it always reads "Download Catalogue"** unless an
 * editor has written something else. The reference draws two buttons with that
 * wording, and a hero with one looks unbalanced.
 *
 * Two sources:
 *
 *   1. **The banner's own `secondary_cta_*` pair.** An editor who has written
 *      one means it, and it beats anything decided here.
 *   2. **The CSV** — every published product, built in the browser on the
 *      click and saved as a file.
 *
 * Earlier passes pointed this at an uploaded PDF (`product_catalogue`) and
 * then, when no such file existed, at `/products`. Generating the file removes
 * both compromises: the button now does exactly what it says, with nothing for
 * anyone to upload first.
 */
function secondaryCta(banner, onDownload, busy) {
  if (banner.secondary_cta_label && banner.secondary_cta_url) {
    return {
      label: banner.secondary_cta_label,
      url: banner.secondary_cta_url,
      download: false,
    };
  }

  return {
    label: "Download Catalogue",
    onClick: onDownload,
    busy,
    download: true,
  };
}

/**
 * How strongly the left of the photograph is lightened behind the headline.
 *
 * **The reference has no dark scrim.** The headline is near-black on a bright
 * photograph, which is a better-looking hero and a more fragile one: with the
 * old full-bleed `bg-ink` gone, legibility stopped being something the code
 * guaranteed and became a property of whatever an editor last uploaded. A dark
 * photograph plus dark text is an AA failure nobody would notice until it was
 * live.
 *
 * So the scrim is not removed, it is **inverted and localised** — a light
 * wash fading left to right, behind the text only, leaving the product shot on
 * the right untouched. That is what the reference's own photograph happens to
 * provide (a pale, misty left third); doing it in CSS means every future
 * upload gets it too.
 *
 * `overlay_opacity` still drives it, so the admin's slider still means
 * something — now "how much protection does this image need" rather than "how
 * dark". **With a floor**, because the one thing the slider must not be able
 * to do is make the headline unreadable. An editor may add protection; they
 * may not remove it.
 */
const MINIMUM_PROTECTION = 0.8;

/** How opaque that wash is, floor included. */
const protection = (overlayOpacity) =>
  Math.max(
    MINIMUM_PROTECTION,
    Math.min(Math.max(overlayOpacity ?? 40, 0), 100) / 100,
  );

function Slide({ banner, onDownload, downloading, priority }) {
  const image = banner.desktop_image;

  return (
    // `--hero-min` caps 32rem against the viewport height, so a phone held
    // sideways can still show one whole slide. See index.css.
    // `--hero-min` caps against the viewport height, so a phone held sideways
    // can still show one whole slide. See index.css.
    <div className='relative isolate min-h-(--hero-min) overflow-hidden'>
      {image?.url ? (
        /*
          The photograph is the backdrop at every width again — the client
          wants the desktop composition on a phone, text over the hills with
          the product beside it, and the redlined mock shows exactly that.

          It is anchored `object-left` below `lg`. At 390 the box is 390 tall
          and `object-cover` crops the width to about a third, so something has
          to be chosen: the left third is the pale misty hillside the headline
          needs to sit on, and the product is handled separately below.
        */
        <CloudinaryImage
          src={image.url}
          alt={image.alt ?? ""}
          sizes={SIZES.full}
          priority={priority}
          className='absolute inset-0 -z-10 size-full object-left lg:object-center'
        />
      ) : (
        // No image: a pale ground rather than the deep green it used to be,
        // because the text on top is now dark.
        <div aria-hidden='true' className='absolute inset-0 -z-10 bg-ground' />
      )}

      {/*
        A left-to-right wash, at both sizes now.

        It used to be flat below `lg`, and the note here said why: the
        gradient clears at 68% and on a phone the text column ran most of the
        width, so anything that cleared would clear over words. That stopped
        being true when the phone layout became a row — the text is in a
        column of its own and the product sits beside it. Measured across
        320..430 the text occupies 4%..58% of the width and the product
        61%..96%, and those figures barely move, because the row divides by
        percentage.

        So the flat sheet was washing the whole photograph to protect a
        column that only needs the left 58%. At 0.75 over an 0.8 floor it put
        60% white over the hills, and the band read as pale grey rather than
        as a photograph.

        **It holds 0.80 all the way to 58% and only clears after that**, which
        is more protection across the text than the flat 0.75 it replaces, not
        less — the picture comes back in the 30% to the right of the column,
        where there are no words. That ordering matters: the earlier attempt
        here cleared from 45%, which still measured fine on this bright
        photograph but dropped the *guaranteed* floor at the right of the
        column from 0.60 to 0.50, and the floor is the whole point of
        `MINIMUM_PROTECTION`. An editor may add protection; a layout change
        must not quietly remove it.

        The `lg` geometry is untouched.
      */}
      <div
        aria-hidden='true'
        className='absolute inset-0 -z-10 bg-gradient-to-r from-surface from-0% via-surface/80 via-58% to-surface/5 to-88% lg:bg-transparent lg:from-surface lg:from-0% lg:via-surface/60 lg:via-35% lg:to-transparent lg:to-68%'
        style={{ opacity: protection(banner.overlay_opacity) }}
      />

      {/*
        A row on a phone: text on the left, the product on the right, which is
        the composition the redlined mock marks out.
      */}
      <div className='mx-auto flex h-full max-w-(--container-max) items-center gap-3 pb-16 pt-10 sm:gap-4 pl-(--gutter-l) pr-(--gutter-r) sm:pb-10 lg:block lg:py-20'>
        <div className='min-w-0 flex-1 lg:max-w-xl'>
          {banner.eyebrow_text ? (
            <p className='text-eyebrow font-semibold uppercase tracking-[0.2em] text-brand'>
              {banner.eyebrow_text}
            </p>
          ) : null}

          {/*
            Two lines: the plain half in near-black and the highlighted half in
            the brand green, which is how the reference sets "Pure Nature /
            Perfect Taste". It was white over gold, which only read because the
            image behind it was darkened.
          */}
          {banner.title || banner.title_highlight ? (
            <h1 className='mt-3 font-display text-2xl font-bold leading-[1.1] text-ink sm:text-4xl md:text-5xl lg:text-6xl'>
              {banner.title ? (
                <span className='block'>{banner.title}</span>
              ) : null}
              {banner.title_highlight ? (
                <span className='block text-brand'>
                  {banner.title_highlight}
                </span>
              ) : null}
            </h1>
          ) : null}

          {banner.subtitle ? (
            <p className='mt-3 max-w-lg text-xs leading-relaxed text-ink-muted sm:mt-5 sm:text-base lg:text-lg'>
              {banner.subtitle}
            </p>
          ) : null}

          {/*
            One column of equal-width buttons on a phone, the wrapping row
            from `sm`.

            The reference draws both hero buttons the same width, stacked. As
            a `flex-wrap` row they were sized to their labels — 136px for
            "Explore Our Tea" against 168px for "Download Catalogue" — so the
            pair read as two unrelated controls rather than a primary and its
            alternative.

            `grid w-fit` is what makes them match without a width being
            invented: the column takes the wider label and grid items stretch
            to it by default, so the two stay equal whatever an editor renames
            them to.
          */}
          <div className='mt-5 grid w-fit gap-2 sm:mt-8 sm:flex sm:w-auto sm:flex-wrap sm:gap-3'>
            <Cta
              label={banner.primary_cta_label}
              url={banner.primary_cta_url}
            />
            <Cta
              {...secondaryCta(banner, onDownload, downloading)}
              variant='secondary'
            />
          </div>
        </div>

        {/*
          The product, lifted out of the same photograph.

          Why a second element rather than letting the backdrop show it: the
          banner is 1983x793 and the product group — packet, cups, gold seal —
          runs 53%..92% of its width, 39% of the image. As a full-bleed
          backdrop on a 390x390 phone the crop is about a third of the width,
          and a 39% subject does not fit a 33% window at any anchor. Give it a
          square box of its own, though, and 40% of the width is in frame:
          anchored at 87% that window is 53%..93%, which is the whole group.

          Hidden from `lg`, where the backdrop shows 94% of its width and the
          product is already in it.

          **It bleeds off the right edge on a phone, and carries no corner.**
          At 38% inside the gutter it was a 127px rounded square floating in
          the middle of the band — it read as a thumbnail pasted
          onto the hero rather than as part of the picture, and left the right
          half looking empty, which is most of why the section felt cramped.
          The reference runs the packet and cups to the edge of the screen
          with the cup cut by it.

          `-mr-(--gutter-r)` cancels the container's own gutter rather than
          guessing a number, so the bleed is exactly the gutter at every
          width and nothing can end up past the viewport.

          42% and still square. Square is what keeps the whole group in
          frame: `cover` on a 2.5:1 source crops to the window's ratio, so a
          taller box would show *less* of the packet, not more — at 3:4 the
          window is 30% of the photo's width against the group's 39%, and the
          left of the packet falls out of it. The extra size comes from the
          bleed instead, which costs the text column nothing it needs.
        */}
        {image?.url ? (
          <div className='-mr-(--gutter-r) w-[42%] shrink-0 sm:mr-0 sm:w-[44%] lg:hidden'>
            <CloudinaryImage
              src={image.url}
              alt=''
              aspectRatio='1 / 1'
              sizes={SIZES.thumbnail}
              className='size-full object-[87%_center] sm:rounded-lg'
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The hero (§10.1).
 *
 * One banner renders as a still; several render as a slider. The controls are
 * only built when there is something to move between — a previous/next pair
 * over a single slide is two dead buttons in the tab order.
 *
 * No autoplay. A hero that advances on its own moves the link someone was
 * reaching for, and pausing it is another control to get right; §18's AA bar
 * treats uncontrolled motion as a failure rather than a flourish.
 */
export function Hero({ banners, onDownload, downloading = false }) {
  const slides = banners ?? [];
  const [index, setIndex] = useState(0);
  const start = useRef(null);

  if (slides.length === 0) return null;

  const many = slides.length > 1;
  const current = slides[Math.min(index, slides.length - 1)];

  /*
    Swipe, in about ten lines and no dependency (plan.md D3).

    Pointer events rather than touch events, so a trackpad drag and a stylus
    work the same way. The judgement — was that a swipe, and which way — is in
    `swipeIntent`, where it can be tested; what is left here is remembering
    where the finger went down.
  */
  const onPointerDown = (event) => {
    start.current =
      event.pointerType === "mouse"
        ? null
        : { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event) => {
    const from = start.current;
    start.current = null;
    if (!from) return;

    const direction = swipeIntent(
      event.clientX - from.x,
      event.clientY - from.y,
    );
    if (direction)
      setIndex((i) => advance(i, slides.length, direction === "next" ? 1 : -1));
  };

  return (
    <section
      aria-label='Highlights'
      className='relative'
      {...(many
        ? {
            onPointerDown,
            onPointerUp,
            onPointerCancel: () => (start.current = null),
          }
        : null)}
    >
      <Slide
        banner={current}
        onDownload={onDownload}
        downloading={downloading}
        priority
      />

      {many ? (
        /*
          One control row rather than arrows floating at the sides.

          The side arrows sat at `top-1/2` over a headline that is full-width on
          a phone, so on the screens where they mattered most they covered the
          thing they were pointing at. The comps show no hero controls at all —
          the approved design is a single banner — so there is nothing here to
          contradict by collecting them at the bottom instead.

          The offset is 64px rather than the 24px it started at: the USP strip
          is pulled up 48px over the hero and carries `z-10`, so at the
          smaller value the dots were rendering *behind* it.
        */
        <div className='absolute inset-x-0 bottom-16 flex items-center justify-center gap-1'>
          <button
            type='button'
            aria-label='Previous slide'
            onClick={() => setIndex((i) => advance(i, slides.length, -1))}
            className='grid size-11 place-items-center rounded-full text-ink hover:bg-ink/10'
          >
            <ChevronLeft size={20} strokeWidth={2} aria-hidden='true' />
          </button>

          {slides.map((slide, i) => (
            /*
              The span is the 8px dot the comps draw; the button is the target
              around it. Growing the dot itself to meet 2.5.8 would have
              changed the design — padding it does not.

              24×44, and the width is the part that was wrong: this claimed a
              44px target and was 44px tall by 16px wide, which fails 2.5.8
              outright, and the 4px gap is too small for its spacing
              exemption to rescue. `w-6` meets the 24px minimum without
              spreading the dots the way a 44px-wide target would. See
              `Testimonials`, which had the same bug.
            */
            <button
              key={slide.id}
              type='button'
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => setIndex(i)}
              className='group grid h-11 w-6 place-items-center'
            >
              <span
                className={cn(
                  "block h-2 rounded-full transition-all duration-(--duration-fast)",
                  i === index
                    ? "w-6 bg-brand"
                    : "w-2 bg-ink/35 group-hover:bg-ink/70",
                )}
              />
            </button>
          ))}

          <button
            type='button'
            aria-label='Next slide'
            onClick={() => setIndex((i) => advance(i, slides.length, 1))}
            className='grid size-11 place-items-center rounded-full text-ink hover:bg-ink/10'
          >
            <ChevronRight size={20} strokeWidth={2} aria-hidden='true' />
          </button>
        </div>
      ) : null}
    </section>
  );
}
