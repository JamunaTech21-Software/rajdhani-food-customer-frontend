import { FeatureItem } from "../content/FeatureGrid.jsx";

export function UspStrip({ items }) {
  if (!items?.length) return null;

  return (
    <section
      aria-label='Why Rajdhani'
      className='
        relative
        z-10
        -mt-12
        px-0

        md:-mt-14
        md:px-6

        lg:-mt-12
        lg:px-(--gutter-l)
        lg:pr-(--gutter-r)
      '
    >
      <ul
        className='
          mx-auto
          grid
          w-full
          max-w-(--container-max)
          grid-cols-2

          bg-surface

          /* =========================
             MOBILE
             ========================= */

          gap-x-0
          gap-y-0
          px-1
          py-1

          text-[4px]
          leading-none

          [&>li:nth-child(odd)]:pr-1

          [&>li:nth-child(even)]:border-l
          [&>li:nth-child(even)]:border-line
          [&>li:nth-child(even)]:pl-1

          [&>li:nth-child(n+3)]:border-t
          [&>li:nth-child(n+3)]:border-line
          [&>li:nth-child(n+3)]:pt-1

          [&>li:nth-child(-n+2)]:pb-1

          [&_h3]:text-[4px]
          [&_h3]:leading-none
          [&_h3]:whitespace-nowrap

          [&_p]:text-[4px]
          [&_p]:leading-none
          [&_p]:whitespace-nowrap

          /* =========================
             TABLET
             ========================= */

          md:grid-cols-4
          md:rounded-xl
          md:px-4
          md:py-4
          md:shadow-modal

          md:[&>li:nth-child(odd)]:pr-4

          md:[&>li:nth-child(even)]:border-l-0
          md:[&>li:nth-child(even)]:pl-4

          md:[&>li:nth-child(n+3)]:border-t-0
          md:[&>li:nth-child(n+3)]:pt-0

          md:[&>li:nth-child(-n+2)]:pb-0

          md:[&>li:nth-child(1)]:border-r
          md:[&>li:nth-child(1)]:border-line

          md:[&>li:nth-child(2)]:border-r
          md:[&>li:nth-child(2)]:border-line

          md:[&>li:nth-child(3)]:border-r
          md:[&>li:nth-child(3)]:border-line

          md:[&_h3]:text-[10px]
          md:[&_h3]:leading-tight
          md:[&_h3]:whitespace-nowrap

          md:[&_p]:text-[8px]
          md:[&_p]:leading-tight
          md:[&_p]:whitespace-normal

          /* =========================
             DESKTOP
             ========================= */

          lg:grid-cols-4
          lg:gap-0
          lg:rounded-xl
          lg:px-8
          lg:py-5
          lg:shadow-modal

          lg:[&>li]:px-6

          lg:[&>li:first-child]:pl-0
          lg:[&>li:last-child]:pr-0

          lg:[&>li:nth-child(odd)]:pr-6

          lg:[&>li:nth-child(1)]:border-r
          lg:[&>li:nth-child(1)]:border-line

          lg:[&>li:nth-child(2)]:border-r
          lg:[&>li:nth-child(2)]:border-line

          lg:[&>li:nth-child(3)]:border-r
          lg:[&>li:nth-child(3)]:border-line

          lg:[&>li:nth-child(even)]:border-l-0
          lg:[&>li:nth-child(even)]:pl-6

          lg:[&_h3]:text-xs
          lg:[&_h3]:leading-tight
          lg:[&_h3]:whitespace-nowrap

          lg:[&_p]:text-[10px]
          lg:[&_p]:leading-tight
          lg:[&_p]:whitespace-normal
        '
      >
        {items.map((item) => (
          <FeatureItem key={item.id} item={item} tone='tint' />
        ))}
      </ul>
    </section>
  );
}
