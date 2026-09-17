import { useQuery } from "@tanstack/react-query";
import { Gem, Eye, Target } from "lucide-react";

import { Certifications } from "../components/content/Certifications.jsx";
import { ProcessTimeline } from "../components/content/ProcessTimeline.jsx";
import { PageBlockSection } from "../components/content/PageBlockSection.jsx";
import { RichText } from "../components/content/RichText.jsx";
import { SectionHeading } from "../components/content/SectionHeading.jsx";
import { PageHero } from "../components/layout/PageHero.jsx";
import { StatsBand } from "../components/home/StatsBand.jsx";
import {
  blocksOf,
  itemsOf,
  useCertifications,
  usePageBlocks,
  useProcessSteps,
  useStats,
} from "../hooks/usePageContent.js";
import { publicApi } from "../lib/api.js";
import { blockFor, bulletsOf, PAGE_KEYS } from "../lib/pageContent.js";

/**
 * Mission, Vision and Values — three page blocks drawn as cards.
 *
 * The icons are structural, chosen by `block_key` rather than stored: these
 * three cards are always these three things. Everything a visitor reads comes
 * from the block.
 */
const CARD_ICONS = { mission: Target, vision: Eye, values: Gem };

function FoundationCard({ block }) {
  const Glyph = CARD_ICONS[block.block_key] ?? Gem;
  const bullets = bulletsOf(block);

  return (
    <li className="flex flex-col gap-4 rounded-xl bg-surface p-6 shadow-modal sm:flex-row">
      <span className="grid size-16 shrink-0 place-items-center rounded-full bg-brand-tint text-brand">
        <Glyph size={28} strokeWidth={1.5} aria-hidden="true" />
      </span>

      <div className="min-w-0">
        {block.heading ? (
          <h3 className="font-display text-lg font-semibold text-ink">{block.heading}</h3>
        ) : null}
        <span aria-hidden="true" className="mt-2 mb-3 block h-0.5 w-10 bg-gold" />

        <RichText html={block.body} className="text-sm" />

        {bullets.length ? (
          <ul className="mt-2 space-y-1.5 text-sm text-ink-muted">
            {bullets.map((point) => (
              <li key={point} className="flex items-start gap-2">
                <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
                {point}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}

/**
 * The About page (§10.4).
 *
 * Every section is a `PageBlock` or a `Certification` row, which is the
 * acceptance criterion: all of it is editable from the admin Page Content
 * screen, and none of the copy is in this bundle.
 *
 * **Three of the comp's sections have no public data source**, the same gap
 * that left four sections off the dealer page and the assurance strip off
 * contact: the stats band needs `StatCounter` in group `ABOUT`, the
 * manufacturing timeline needs `ProcessStep` in `MANUFACTURING_PROCESS`, and
 * the values checklist needs either `FeatureItem` in `ABOUT_VALUES` or an
 * `about/values` block. None of those rows exist in the database either, so
 * they need content as well as a route — see the ticket.
 */
export function AboutPage() {
  const hero = useQuery({
    queryKey: ["public", "banners", "ABOUT_HERO"],
    queryFn: () => publicApi.list("/public/banners", { params: { placement: "ABOUT_HERO" } }),
    staleTime: 5 * 60_000,
  });

  const blocks = usePageBlocks(PAGE_KEYS.about);
  const certifications = useCertifications();
  const stats = useStats("ABOUT");
  const manufacturing = useProcessSteps("MANUFACTURING_PROCESS");

  const all = blocksOf(blocks);
  const foundations = ["mission", "vision", "values"]
    .map((key) => blockFor(all, key))
    .filter(Boolean);

  return (
    <>
      <PageHero banner={hero.data?.items?.[0]} title="About Us" breadcrumb="About Us" />

      <PageBlockSection block={blockFor(all, "our_story")} id="our-story" />

      {foundations.length ? (
        <section aria-labelledby="foundations-heading" className="bg-ground py-(--space-section)">
          <div className="mx-auto max-w-(--container-max) pl-(--gutter-l) pr-(--gutter-r)">
            <SectionHeading
              block={blockFor(all, "foundations")}
              id="foundations-heading"
              eyebrow="Our Foundations"
              heading="Our Mission, Vision & Values"
            />

            <ul className="mt-10 grid gap-6 lg:grid-cols-3">
              {foundations.map((block) => (
                <FoundationCard key={block.block_key} block={block} />
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <StatsBand stats={itemsOf(stats)} label="Rajdhani in numbers" />

      {/* The strength block draws the manufacturing steps beside its text, in
          place of the image a block would otherwise take. Both halves can be
          absent independently: no block and the section does not render at all;
          no steps and the block falls back to its own image. */}
      <PageBlockSection block={blockFor(all, "strength")} id="strength" reversed tone="ground">
        {itemsOf(manufacturing).length ? (
          <ProcessTimeline steps={itemsOf(manufacturing)} compact />
        ) : undefined}
      </PageBlockSection>

      <Certifications
        items={certifications.data?.items}
        block={blockFor(all, "certifications")}
        eyebrow="Certified For Your Trust"
        heading="Our Certifications"
        tone="surface"
      />
    </>
  );
}
