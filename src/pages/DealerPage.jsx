import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { CloudinaryImage } from "../components/CloudinaryImage.jsx";
import { ApplicationForm } from "../components/dealer/ApplicationForm.jsx";
import { DealerSuccessModal } from "../components/dealer/SuccessModal.jsx";
import { useDownload } from "../hooks/useDownload.js";
import { publicApi } from "../lib/api.js";
import { SIZES } from "../lib/cloudinary.js";
import { DOWNLOAD_KEYS } from "../lib/downloadKeys.js";

function Hero({ banner }) {
  if (!banner) return null;

  const overlay = Math.min(Math.max(banner.overlay_opacity ?? 50, 0), 100) / 100;

  return (
    <section aria-label="Dealer and distributor" className="relative isolate overflow-hidden">
      {banner.desktop_image?.url ? (
        <CloudinaryImage
          src={banner.desktop_image.url}
          alt={banner.desktop_image.alt ?? ""}
          sizes={SIZES.full}
          priority
          className="absolute inset-0 -z-10 size-full"
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-brand-deep" />
      )}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-ink" style={{ opacity: overlay }} />

      <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:py-28">
        <div className="max-w-xl">
          {banner.eyebrow_text ? (
            <p className="text-eyebrow font-semibold uppercase tracking-[0.2em] text-gold">
              {banner.eyebrow_text}
            </p>
          ) : null}

          <h1 className="mt-3 font-display text-4xl font-bold leading-[1.1] text-ink-inverse sm:text-5xl">
            {banner.title}
            {banner.title_highlight ? (
              <span className="block text-gold">{banner.title_highlight}</span>
            ) : null}
          </h1>

          {banner.subtitle ? (
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-inverse/85">
              {banner.subtitle}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/**
 * The dealer / distributor page (§10.3).
 *
 * **Four of the seven scope sections have no public data source.** "Why Partner
 * With Us" cards and the benefit chips need `FeatureItem`, the five-step
 * timeline needs `ProcessStep`, the requirements checklist needs a `PageBlock`,
 * and the network counters need `StatCounter` outside the `HOME` group — none of
 * which the API exposes publicly. Only `HOME_USP` feature items and `HOME` stats
 * are reachable, via `/public/home`.
 *
 * Rather than hardcode that copy — which would put content in the bundle and
 * take it out of the editors' hands, against §18.2 — those sections are absent
 * until the data is served. The hero, the form and the success modal are the
 * parts that work, and they carry both of this ticket's testable criteria.
 */
export function DealerPage() {
  const [result, setResult] = useState(null);

  const hero = useQuery({
    queryKey: ["public", "banners", "DEALER_HERO"],
    queryFn: () => publicApi.list("/public/banners", { params: { placement: "DEALER_HERO" } }),
    staleTime: 5 * 60_000,
  });

  const brochure = useDownload(DOWNLOAD_KEYS.dealerBrochure);

  return (
    <>
      <Hero banner={hero.data?.items?.[0]} />

      <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
            Become a Dealer / Distributor
          </h2>
          <p className="mt-2 text-ink-muted">
            Fill out the form and our team will get in touch with you.
          </p>

          <div className="mt-8">
            <ApplicationForm onSuccess={setResult} />
          </div>
        </div>
      </div>

      <DealerSuccessModal
        result={result}
        onOpenChange={(open) => !open && setResult(null)}
        brochure={brochure.data}
      />
    </>
  );
}
