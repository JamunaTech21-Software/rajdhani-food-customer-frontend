import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useState } from "react";

import { ApplicationForm } from "../components/dealer/ApplicationForm.jsx";
import { BuildFutureCard } from "../components/dealer/BuildFutureCard.jsx";
import { DistributionNetwork } from "../components/dealer/DistributionNetwork.jsx";
import { HeroChips } from "../components/dealer/HeroChips.jsx";
import { RequirementsPanel } from "../components/dealer/RequirementsPanel.jsx";
import { DealerSuccessModal } from "../components/dealer/SuccessModal.jsx";
import { FeatureGrid } from "../components/content/FeatureGrid.jsx";
import { PageBlockSection } from "../components/content/PageBlockSection.jsx";
import { ProcessTimeline } from "../components/content/ProcessTimeline.jsx";
import { SectionHeading } from "../components/content/SectionHeading.jsx";
import { PageHero } from "../components/layout/PageHero.jsx";
import {
  blocksOf,
  itemsOf,
  useFeatureItems,
  usePageBlocks,
  useProcessSteps,
  useStats,
} from "../hooks/usePageContent.js";
import { useSeo } from "../hooks/useSeo.js";
import { useDownload } from "../hooks/useDownload.js";
import { publicApi } from "../lib/api.js";
import { ACTION_CLASS } from "../lib/buttons.js";
import { cn } from "../lib/cn.js";
import { DOWNLOAD_KEYS } from "../lib/downloadKeys.js";
import { blockFor, bulletsOf, PAGE_KEYS } from "../lib/pageContent.js";
import { PAGE_META } from "../lib/seo.js";
// TEMPORARY — delete with `lib/contentFixtures.js` once the admin content is in.
import {
  blockOrFixture,
  DEALER_BENEFIT_ITEMS,
  DEALER_BLOCKS,
  DEALER_HERO_CHIPS,
  DEALER_NETWORK_STATS,
  DEALER_PROCESS_STEPS,
  FIXTURES_ENABLED,
  orFixture,
} from "../lib/contentFixtures.js";

/**
 * The dealer / distributor page (§10.3).
 *
 * This page was a hero and a form. Its four other sections had no public data
 * source — the benefit cards need `FeatureItem`, the five-step timeline needs
 * `ProcessStep`, the requirements checklist a `PageBlock`, and the counters
 * `StatCounter` outside the `HOME` group — and none of those were exposed.
 * RTPP-67 shipped all three endpoints, so the sections are built and every one
 * of them reads a resource the admin already edits. Nothing here is hardcoded
 * copy; the stand-ins in `contentFixtures.js` are development-only and lose to
 * a published row.
 *
 * The brochure button is the one control with a third state. It resolves
 * through `/public/downloads/dealer_brochure`, which 404s today because nobody
 * has created the row, so it renders as nothing rather than as a dead link.
 * Creating it in the dashboard's Downloads screen is all it needs.
 */
export function DealerPage() {
  const [result, setResult] = useState(null);

  const hero = useQuery({
    queryKey: ["public", "banners", "DEALER_HERO"],
    queryFn: () => publicApi.list("/public/banners", { params: { placement: "DEALER_HERO" } }),
    staleTime: 5 * 60_000,
  });

  useSeo(PAGE_META.dealer);

  const brochure = useDownload(DOWNLOAD_KEYS.dealerBrochure);

  /*
    The page's five content sources.

    Live today: the hero banner, the `intro` block and four `DEALER_BENEFITS`
    items. Empty: the `network`, `requirements` and `build_future` blocks, the
    `BECOME_DEALER` steps and the `DEALER_NETWORK` counters — which is why five
    of the six sections did not exist until now. Each is resolved against the
    stand-ins in `contentFixtures.js`, and each becomes a plain pass-through the
    moment its rows are published.

    None of them is counted towards a page-level loading or error state: the
    application form is what this page is *for*, and it must not be replaced by
    a skeleton because a counter failed to load.
  */
  const blocks = usePageBlocks(PAGE_KEYS.dealer);
  const benefitItems = useFeatureItems("DEALER_BENEFITS");
  const steps = useProcessSteps("BECOME_DEALER");
  const networkCounters = useStats("DEALER_NETWORK");

  const all = blocksOf(blocks);

  const introBlock = blockOrFixture(blockFor(all, "intro"), DEALER_BLOCKS.intro);
  const networkBlock = blockOrFixture(blockFor(all, "network"), DEALER_BLOCKS.network);
  const requirementsBlock = blockOrFixture(
    blockFor(all, "requirements"),
    DEALER_BLOCKS.requirements,
  );
  const buildFutureBlock = blockOrFixture(
    blockFor(all, "build_future"),
    DEALER_BLOCKS.build_future,
  );

  const benefits = orFixture(itemsOf(benefitItems), DEALER_BENEFIT_ITEMS);
  const processSteps = orFixture(itemsOf(steps), DEALER_PROCESS_STEPS);
  const networkStats = orFixture(itemsOf(networkCounters), DEALER_NETWORK_STATS);

  /*
    The hero chips are the `intro` block's bullet list — see `HeroChips` for
    why that field and not a `FeatureItem` section. The live block has none, so
    the fixture supplies them; a block with real bullets wins outright.
  */
  const introChips = bulletsOf(introBlock).length
    ? introBlock
    : { ...introBlock, bullet_points: FIXTURES_ENABLED ? DEALER_HERO_CHIPS : [] };

  return (
    <>
      <PageHero banner={hero.data?.items?.[0]} title="Dealer / Distributor">
        <HeroChips items={bulletsOf(introChips)} />
      </PageHero>

      {/*
        The comp's rhythm, measured the way Quality's and About's were: its
        bands sit far closer together than `--space-section`'s 48px a side.
        Overriding the property rather than editing five sections — it
        cascades, so every band below resolves against it and no other page
        inherits it.
      */}
      <div className="[--space-section:2rem] 2xl:[--space-section:2.5rem]">
        {/* Why Partner With Us — heading, copy and the brochure button on the
            left, the benefit cards beside them. */}
        {/* The block's bullets are the hero chips, not a list under its prose —
            passed through without them so they are not drawn twice. */}
        {/*
          Measured off the comp (a 1055px render of a 1280 design, so x1.2133):
          the text runs x40..290 and the five cards x335..1018, which is 28% of
          the row against 70%, with a 36px gutter between. The flat default —
          0.7fr and a 112px gutter — gives the text 41% and would leave each
          card about 120px.

          `items-start`, not centred: the comp lines the heading up with the
          top of the cards, both at y428.

          The heading is held at `text-3xl`. `PageBlockBody` steps up to
          `text-4xl` from `sm`, and 36px puts "Why Partner With Us?" onto two
          lines in a 342px column; the comp sets it on one at about 30px.
        */}
        <PageBlockSection
          block={{ ...introBlock, bullet_points: [] }}
          id="dealer-intro"
          ornament
          split="lg:grid-cols-[minmax(0,0.4fr)_minmax(0,1fr)] lg:items-start lg:gap-9"
          bodyClassName="lg:[&_h2]:text-3xl"
          bodyFooter={
            /*
              Rendered only once the download resolves, which is the rule every
              other brochure button on the site follows — `/public/downloads/
              {key}` answers with the file or a 404, and `dealer_brochure` has
              no row yet, so today this is absent rather than dead. A button
              that 404s reads as a broken site; a button that is not there
              reads as content nobody has uploaded.

              An anchor, not a handler: the href is the file, so the browser
              does the download and middle-click and "save link as" work. New
              tab, because a PDF that replaces the page loses the form the
              visitor was about to fill in.

              `brochure.title` first — an editor who names the row "2026 Dealer
              Pack" gets that on the button.
            */
            brochure.data ? (
              <a
                href={brochure.data.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(ACTION_CLASS, "mt-7")}
              >
                <Download size={16} strokeWidth={2} aria-hidden="true" />
                {brochure.data.title ?? "Download Dealer Brochure"}
              </a>
            ) : null
          }
        >
          {benefits.length ? (
            // `gap-4` — the comp's cards sit on a 12px pitch at its scale,
            // which is 15px here. The grid's own `gap-6` is a section gutter,
            // not a card one.
            <FeatureGrid
              items={benefits}
              columns="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
              className="gap-4"
              layout="stacked"
            />
          ) : undefined}
        </PageBlockSection>

        <DistributionNetwork block={networkBlock} stats={networkStats} />

        {processSteps.length ? (
          <section aria-labelledby="dealer-process-heading" className="py-(--space-section)">
            <div className="mx-auto max-w-(--container-max) pl-(--gutter-l) pr-(--gutter-r)">
              <SectionHeading
                id="dealer-process-heading"
                heading="How to Become Our Dealer / Distributor"
              />

              <ProcessTimeline steps={processSteps} variant="circle" className="mt-10" />
            </div>
          </section>
        ) : null}

        {/*
          Requirements, the form and the closing card on one row, as the comp
          draws them. Three tracks at `xl` only: at `lg` the form's paired
          fields would be about 190px each with two cards beside them, so the
          middle column keeps two thirds there and the closing card drops
          under it.

          The `xl` split is measured off the comp, whose three panels run
          x37..375, x405..825 and x845..995 — 37% / 46% / 17% of the row. The
          requirements panel is the wide one and the closing card is barely a
          sixth; an even-handed guess had them at 27% and 25%, which made the
          checklist cramped and the little card look like a third column
          rather than a footnote beside the form.
        */}
        <section
          aria-labelledby="dealer-form-heading"
          className="pb-(--space-section) pt-(--space-section)"
        >
          <div className="mx-auto grid max-w-(--container-max) gap-6 pl-(--gutter-l) pr-(--gutter-r) lg:grid-cols-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1.45fr)_minmax(0,0.55fr)] xl:items-start [&>*]:min-w-0">
            <RequirementsPanel block={requirementsBlock} />

            <div className="rounded-xl border border-line bg-surface p-5 sm:p-6 lg:p-7">
              <h2
                id="dealer-form-heading"
                className="font-display text-xl font-bold text-ink sm:text-2xl"
              >
                Become a Dealer / Distributor
              </h2>
              <p className="mt-2 text-sm text-ink-muted">
                Fill out the form and our team will get in touch with you.
              </p>

              <div className="mt-6">
                <ApplicationForm onSuccess={setResult} />
              </div>
            </div>

            {/* Three across only at `xl`. At `lg` the row is two, and a third
                card alone in a half-width cell reads as a gap — so it spans
                the row instead. The same treatment the contact page gives its
                map panel. */}
            <BuildFutureCard block={buildFutureBlock} className="lg:col-span-2 xl:col-span-1" />
          </div>
        </section>
      </div>

      <DealerSuccessModal
        result={result}
        onOpenChange={(open) => !open && setResult(null)}
        brochure={brochure.data}
      />
    </>
  );
}
