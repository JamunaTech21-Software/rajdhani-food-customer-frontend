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
    "inline-flex h-11 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-medium transition-colors duration-(--duration-fast) sm:h-12 sm:gap-2 sm:px-6 sm:text-sm",

    variant === "primary"
      ? "bg-brand text-on-brand hover:bg-brand-dark"
      : "border border-brand/60 bg-transparent text-brand hover:bg-brand hover:text-on-brand",
  );

  const Glyph = download || /^\/downloads\//.test(url) ? Download : ArrowRight;

  const content = (
    <>
      {label}
      <Glyph size={16} strokeWidth={2} aria-hidden='true' />
    </>
  );

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
      <a
        href={url}
        {...(download
          ? {
              target: "_blank",
              rel: "noopener noreferrer",
            }
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
 * Secondary CTA
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
 * Minimum image protection.
 */
const MINIMUM_PROTECTION = 0.8;

/**
 * How opaque the light wash should be.
 */
const protection = (overlayOpacity) =>
  Math.max(
    MINIMUM_PROTECTION,
    Math.min(Math.max(overlayOpacity ?? 40, 0), 100) / 100,
  );

/**
 * Hero slide
 *
 * Important:
 * - Only ONE image is rendered.
 * - The same desktop_image is used as the responsive hero background.
 * - No separate mobile/right-side image is rendered.
 */
function Slide({ banner, onDownload, downloading, priority }) {
  const image = banner.desktop_image;

  return (
    <div
      className='
        relative
        isolate
        overflow-hidden

        min-h-[270px]

        sm:min-h-[320px]

        md:min-h-[380px]

        lg:min-h-(--hero-min)
      '
    >
      {image?.url ? (
        <CloudinaryImage
          src={image.url}
          alt={image.alt ?? ""}
          sizes={SIZES.full}
          priority={priority}
          className='absolute inset-0 -z-10 size-full object-cover object-[80%_center] lg:object-center'
        />
      ) : (
        <div aria-hidden='true' className='absolute inset-0 -z-10 bg-ground' />
      )}

      {/* Image protection / readability overlay */}
      <div
        aria-hidden='true'
        className='
          absolute
          inset-0
          -z-10

          bg-gradient-to-r
          from-surface
          from-0%
          via-surface/80
          via-58%
          to-surface/5
          to-88%

          lg:bg-transparent
          lg:from-surface
          lg:from-0%
          lg:via-surface/60
          lg:via-35%
          lg:to-transparent
          lg:to-68%
        '
        style={{
          opacity: protection(banner.overlay_opacity),
        }}
      />

      {/* Responsive hero content */}
      <div
        className='
          mx-auto
          flex
          h-full
          max-w-(--container-max)
          items-center

          px-(--gutter-l)
          pr-(--gutter-r)

          pb-12
          pt-8

          sm:pb-10
          sm:pt-10

          lg:block
          lg:py-20
        '
      >
        <div
          className='
            min-w-0

            w-[62%]

            sm:w-[58%]

            md:w-[55%]

            lg:w-auto
            lg:max-w-xl
          '
        >
          {banner.eyebrow_text ? (
            <p className='text-eyebrow font-semibold uppercase tracking-[0.2em] text-brand'>
              {banner.eyebrow_text}
            </p>
          ) : null}

          {/*
            Title + Subtitle use exactly the same width.

            Mobile: 150px
            Small: 200px
            Medium: 220px
            Desktop: 550px
          */}
          <div
            className='
              w-[150px]

              sm:w-[200px]

              md:w-[220px]

              lg:w-[550px]
              lg:max-w-none
            '
          >
            {banner.title || banner.title_highlight ? (
              <h1
                className='
                  mt-2
                  w-full
                  font-display
                  text-xl
                  font-bold
                  leading-[1.08]
                  text-ink

                  sm:mt-3
                  sm:text-3xl

                  md:text-4xl

                  lg:text-6xl
                '
              >
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
              <p
                className='
                  mt-2
                  w-full
                  text-[10px]
                  leading-relaxed
                  text-ink

                  sm:mt-4
                  sm:text-xs

                  md:text-sm

                  lg:text-lg
                '
              >
                {banner.subtitle}
              </p>
            ) : null}
          </div>

          {/* Buttons */}
          <div
            className='
              mt-3
              grid
              w-fit
              gap-1.5

              sm:mt-6
              sm:flex
              sm:w-auto
              sm:flex-wrap
              sm:gap-3

              lg:mt-8
            '
          >
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
      </div>
    </div>
  );
}

/**
 * Hero
 *
 * One banner renders as a still.
 * Multiple banners render as a slider.
 */
export function Hero({ banners, onDownload, downloading = false }) {
  const slides = banners ?? [];

  const [index, setIndex] = useState(0);

  const start = useRef(null);

  if (slides.length === 0) return null;

  const many = slides.length > 1;

  const current = slides[Math.min(index, slides.length - 1)];

  /**
   * Swipe handling.
   */
  const onPointerDown = (event) => {
    start.current =
      event.pointerType === "mouse"
        ? null
        : {
            x: event.clientX,
            y: event.clientY,
          };
  };

  const onPointerUp = (event) => {
    const from = start.current;

    start.current = null;

    if (!from) return;

    const direction = swipeIntent(
      event.clientX - from.x,
      event.clientY - from.y,
    );

    if (direction) {
      setIndex((i) => advance(i, slides.length, direction === "next" ? 1 : -1));
    }
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
        <div
          className='
            absolute
            inset-x-0
            bottom-10
            flex
            items-center
            justify-center
            gap-1

            sm:bottom-12
          '
        >
          <button
            type='button'
            aria-label='Previous slide'
            onClick={() => setIndex((i) => advance(i, slides.length, -1))}
            className='
              grid
              size-11
              place-items-center
              rounded-full
              text-ink
              hover:bg-ink/10
            '
          >
            <ChevronLeft size={20} strokeWidth={2} aria-hidden='true' />
          </button>

          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type='button'
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => setIndex(i)}
              className='
                group
                grid
                h-11
                w-6
                place-items-center
              '
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
            className='
              grid
              size-11
              place-items-center
              rounded-full
              text-ink
              hover:bg-ink/10
            '
          >
            <ChevronRight size={20} strokeWidth={2} aria-hidden='true' />
          </button>
        </div>
      ) : null}
    </section>
  );
}
