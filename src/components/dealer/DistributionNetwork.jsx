import { CloudinaryImage } from "../CloudinaryImage.jsx";
import { SectionHeading } from "../content/SectionHeading.jsx";
import { Stat } from "../home/StatsBand.jsx";
import { SIZES } from "../../lib/cloudinary.js";
import { cn } from "../../lib/cn.js";

/**
 * "Our Distribution Network" — the counters, and the map beside them.
 *
 * **The map is a picture, and it is the editor's.** It comes from the `network`
 * block's own image field rather than from an asset in this repo, for two
 * reasons. The obvious one is that no such asset exists: nothing in the
 * client's supplied set is a map. The one that matters is that a Bangladesh
 * outline drawn from memory would be invented geography shipped as fact, and a
 * decorative silhouette of a real country is not a thing to approximate.
 *
 * **It is decoration, not data.** The API has no coordinate on any dealer or
 * location resource — the only `latitude`/`longitude` in the whole contract
 * belong to the company's own office on `SiteSettings`, for the contact page.
 * `dealer_applications` holds `district_id`, `upazila_id` and `address_line`
 * and no geometry, and those rows are applicants rather than dealers, some of
 * them rejected. So there is nothing here that could be plotted and nothing
 * here that should be: the image is `alt=""` and `aria-hidden`, and any pins
 * on it are the designer's marks, not addresses.
 *
 * Without an image the counters simply take the full width, which is the right
 * empty state — the numbers are the content and the map is the flourish.
 */
export function DistributionNetwork({ block, stats }) {
  const counters = stats ?? [];
  if (!block && counters.length === 0) return null;

  const map = block?.image;

  return (
    <section
      aria-labelledby="dealer-network-heading"
      className="bg-ground-warm py-(--space-section)"
    >
      <div
        className={cn(
          "mx-auto max-w-(--container-max) pl-(--gutter-l) pr-(--gutter-r)",
          // The comp sets the heading and counters left of the map rather than
          // centred over it, but only once there is room for both.
          map?.url &&
            "lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-center lg:gap-10 lg:[&>*]:min-w-0",
        )}
      >
        <div>
          <SectionHeading
            block={block}
            id="dealer-network-heading"
            heading="Our Distribution Network"
            subheading="We are expanding across Bangladesh and looking for passionate partners to grow together."
            align={map?.url ? "start" : "center"}
          />

          {counters.length ? (
            /*
              Two up on a phone and four from `md`. Each counter is a disc, a
              figure and a label on one line — four across a 343px screen gives
              each about 78px, and "Districts Covered" alone wants more.
            */
            <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4 [&>*]:min-w-0">
              {counters.map((stat) => (
                <li key={stat.id}>
                  <Stat stat={stat} layout="inline" />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {map?.url ? (
          // `aria-hidden` with an empty alt: it carries no information the
          // counters beside it do not already state, and a screen reader
          // announcing "map of Bangladesh" would imply it can be read.
          <div aria-hidden="true" className="mt-10 lg:mt-0">
            {/*
              `mix-blend-multiply` because the supplied map is a 24-bit PNG
              with no alpha: its background is opaque white, and dropped on
              this band it would be a white rectangle with a country in it.
              Multiplying leaves white alone and darkens nothing else, so the
              silhouette sits on the band as though it were cut out.

              On the image rather than the asset, and harmless either way — a
              transparent PNG an editor uploads later has no white to remove
              and multiplies to itself. It also survives a change of band
              colour, which a matted background would not.
            */}
            <CloudinaryImage
              src={map.url}
              alt=""
              aspectRatio={
                map.width > 0 && map.height > 0 ? `${map.width} / ${map.height}` : "4 / 3"
              }
              sizes={SIZES.half}
              className="mx-auto w-full max-w-sm lg:max-w-none"
              imgClassName="object-contain mix-blend-multiply"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
