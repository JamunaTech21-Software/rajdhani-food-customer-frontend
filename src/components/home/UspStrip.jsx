import { FeatureItem } from "../content/FeatureGrid.jsx";

export function UspStrip({ items }) {
  if (!items?.length) return null;

  return (
    <section
      aria-label='Why Rajdhani'
      className='
        relative
        z-10
        -mt-8
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
          rounded-lg
          px-2
          py-2.5

          [&>li:nth-child(odd)]:pr-2.5

          [&>li:nth-child(even)]:border-l
          [&>li:nth-child(even)]:border-line
          [&>li:nth-child(even)]:pl-2.5

          [&>li:nth-child(n+3)]:border-t
          [&>li:nth-child(n+3)]:border-line
          [&>li:nth-child(n+3)]:pt-2.5

          [&>li:nth-child(-n+2)]:pb-2.5

          [&_[data-feature-title]]:text-[11px]
          [&_[data-feature-title]]:leading-tight
          [&_[data-feature-title]]:whitespace-normal

          [&_[data-feature-text]]:text-[9px]
          [&_[data-feature-text]]:leading-snug
          [&_[data-feature-text]]:whitespace-normal

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

          md:[&_[data-feature-title]]:text-[10px]
          md:[&_[data-feature-title]]:leading-tight
          md:[&_[data-feature-title]]:whitespace-nowrap

          md:[&_[data-feature-text]]:text-[8px]
          md:[&_[data-feature-text]]:leading-tight
          md:[&_[data-feature-text]]:whitespace-normal

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

          lg:[&_[data-feature-title]]:text-xs
          lg:[&_[data-feature-title]]:leading-tight
          lg:[&_[data-feature-title]]:whitespace-nowrap

          lg:[&_[data-feature-text]]:text-[10px]
          lg:[&_[data-feature-text]]:leading-tight
          lg:[&_[data-feature-text]]:whitespace-normal
        '
      >
        {items.map((item) => (
          <FeatureItem key={item.id} item={item} tone='tint' markClassName='size-8 md:size-9 lg:size-11' />
        ))}
      </ul>
    </section>
  );
}
