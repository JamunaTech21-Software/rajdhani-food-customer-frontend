import { ArrowRight, Handshake } from "lucide-react";
import { Link } from "react-router";

import { isExternal } from "../../lib/nav.js";

// 44px, not the comp's 39px. Measuring the bar put the button at 131×39, and
// 39 is below the 44px target WCAG 2.5.5 asks for — `responsive.test.mjs`
// enforces that floor and would fail a smaller one. `h-11` is as close to the
// reference as the accessibility budget allows; the width lands at ~137
// against the comp's 131 on its own.
const ACTION =
  "inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-surface px-3 text-xs font-medium text-brand transition-colors duration-(--duration-fast) hover:bg-ground sm:gap-2 sm:px-6 sm:text-sm";

/**
 * "Become Our Distributor / Dealer" (§10.1) — the `DEALER_CTA` banner.
 */
export function DealerCta({ banner }) {
  if (!banner?.title) return null;

  const label = banner.primary_cta_label;
  const url = banner.primary_cta_url;

  const action =
    !label || !url ? null : (
      <>
        {label}
        <ArrowRight size={16} strokeWidth={2} aria-hidden='true' />
      </>
    );

  return (
    <section
      aria-labelledby='dealer-cta-heading'
      className='mx-auto max-w-(--container-max) pl-(--gutter-l) pr-(--gutter-r)'
    >
      <div className='relative isolate flex flex-row items-center gap-2 overflow-hidden rounded-none bg-brand px-2.5 py-3 sm:gap-6 sm:rounded-xl sm:px-8 sm:py-4 lg:gap-8 lg:py-3.5 lg:pr-64'>
        {/* Right-side leaf image — mobile + desktop, hidden only on tablet */}
        <img
          src='/home-distibutor-right.png'
          alt=''
          aria-hidden='true'
          loading='lazy'
          decoding='async'
          className='fade-in-from-left absolute inset-y-0 right-0 -z-10 block h-full w-[24%] object-cover md:hidden lg:block lg:w-[20%]'
        />

        <span
          aria-hidden='true'
          className='grid size-10 shrink-0 place-items-center rounded-full bg-surface text-brand sm:size-16'
        >
          <Handshake
            className='size-[21px] sm:size-[30px]'
            strokeWidth={1.75}
          />
        </span>

        <div className='min-w-0 flex-1'>
          <h2
            id='dealer-cta-heading'
            className='max-w-[155px] font-display text-[0.72rem] font-bold leading-tight text-on-brand sm:max-w-none sm:text-xl sm:leading-7'
          >
            {banner.title}

            {banner.title_highlight ? (
              <span className='text-gold'> {banner.title_highlight}</span>
            ) : null}
          </h2>

          {banner.subtitle ? (
            <p className='mt-0.5 line-clamp-2 max-w-[155px] text-[0.55rem] leading-snug text-on-brand/85 sm:mt-1 sm:line-clamp-none sm:max-w-xl sm:text-sm sm:leading-5'>
              {banner.subtitle}
            </p>
          ) : null}
        </div>

        {action ? (
          isExternal(url) ? (
            <a
              href={url}
              className='inline-flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-md bg-surface px-2.5 text-[0.65rem] font-medium text-brand transition-colors duration-(--duration-fast) hover:bg-ground sm:h-11 sm:gap-1.5 sm:px-3 sm:text-xs lg:px-6 lg:text-sm'
            >
              {action}
            </a>
          ) : (
            <Link
              to={url}
              className='inline-flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-md bg-surface px-2.5 text-[0.65rem] font-medium text-brand transition-colors duration-(--duration-fast) hover:bg-ground sm:h-11 sm:gap-1.5 sm:px-3 sm:text-xs lg:px-6 lg:text-sm'
            >
              {action}
            </Link>
          )
        ) : null}
      </div>
    </section>
  );
}
