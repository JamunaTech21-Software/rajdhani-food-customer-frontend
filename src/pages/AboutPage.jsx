import { useQuery } from "@tanstack/react-query";
import { CircleCheck, Gem, Eye, Target } from "lucide-react";

import { Certifications } from "../components/content/Certifications.jsx";
import { LeafWatermark } from "../components/content/LeafWatermark.jsx";
import { ProcessTimeline } from "../components/content/ProcessTimeline.jsx";
import { PageBlockSection } from "../components/content/PageBlockSection.jsx";
import { RichText } from "../components/content/RichText.jsx";
import { SectionHeading } from "../components/content/SectionHeading.jsx";
import { PageHero } from "../components/layout/PageHero.jsx";
import { StatsBand } from "../components/home/StatsBand.jsx";
import { PageSections } from "../components/state/PageSections.jsx";
import {
  blocksOf,
  itemsOf,
  useCertifications,
  usePageBlocks,
  useProcessSteps,
  useStats,
} from "../hooks/usePageContent.js";
import { useSeo } from "../hooks/useSeo.js";
import { publicApi } from "../lib/api.js";
import { combineState, retryFailed } from "../lib/loadState.js";
import { blockFor, bulletsOf, PAGE_KEYS } from "../lib/pageContent.js";
import { PAGE_META } from "../lib/seo.js";

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
        {/* The comp rules Mission and Vision under the title and leaves Values
            without one — its checklist starts straight after the heading. The
            body is what tells them apart, so that is what this keys on. */}
        {block.body ? (
          <span aria-hidden="true" className="mt-2 mb-3 block h-0.5 w-10 bg-gold" />
        ) : (
          <span className="mt-3 block" />
        )}

        <RichText html={block.body} className="text-sm" />

        {bullets.length ? (
          <ul className="mt-2 space-y-1.5 text-sm text-ink-muted">
            {bullets.map((point) => (
              <li key={point} className="flex items-start gap-2">
                {/* A circled check, not a dot: the comp ticks these off, and
                    `PageBlockBody` already draws bullets the same way. */}
                <CircleCheck
                  size={16}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-brand"
                />
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
 * **Every section of the comp now has rows behind it** (A3–A5, 2026-09-21):
 * `StatCounter` in group `ABOUT`, `ProcessStep` in `MANUFACTURING_PROCESS`,
 * and `mission` / `vision` / `values` / `strength` blocks. The routes were
 * already here and waiting; what was missing was content, which is why the
 * page read as half-built rather than as broken.
 */
export function AboutPage() {
  const hero = useQuery({
    queryKey: ["public", "banners", "ABOUT_HERO"],
    queryFn: () => publicApi.list("/public/banners", { params: { placement: "ABOUT_HERO" } }),
    staleTime: 5 * 60_000,
  });

  useSeo(PAGE_META.about);

  const blocks = usePageBlocks(PAGE_KEYS.about);
  const certifications = useCertifications();
  const stats = useStats("ABOUT");
  const manufacturing = useProcessSteps("MANUFACTURING_PROCESS");

  const all = blocksOf(blocks);
  const foundations = ["mission", "vision", "values"]
    .map((key) => blockFor(all, key))
    .filter(Boolean);

  // The hero is deliberately not in this list. It carries a hardcoded title and
  // renders with or without its banner, so a failed banner request is not a
  // failed page — counting it would put an error over a page that reads fine.
  const content = [blocks, certifications, stats, manufacturing];
  const state = combineState(content, {
    hasContent: Boolean(
      all.length ||
        itemsOf(stats).length ||
        itemsOf(manufacturing).length ||
        certifications.data?.items?.length,
    ),
  });

  return (
    <>
      <PageHero banner={hero.data?.items?.[0]} title="About Us" breadcrumb="About Us" />

      <PageSections
        state={state}
        error={blocks.error}
        onRetry={() => retryFailed(content)}
        emptyTitle="Our story is being written"
        emptyBody="This page is being prepared. In the meantime our teas and our contact details are all here."
      >
        {/*
          The About comp's rhythm, measured rather than estimated.

          Scanning the reference for where each full-bleed band starts and
          where its content actually begins — a 1024px render of a 1280 design,
          so x1.25 — the bands carry 25 to 48px of padding a side, averaging
          about 32: Our Company 35/39, Foundations 26/48, the stats band 38/24,
          Our Strength 25/25, Certifications 36/30. Every band here is adjacent
          to the next, so what separates two of them is the pair of paddings
          between: the comp's Our Company to Foundations join is 39 + 26 = 65px.

          `--space-section` is 48px at this width, so ours was 96px for the same
          join. The token's own note says that is deliberate — "still generous
          against the comp's ~63px at desktop" — but generous twice over is what
          made the page feel loose.

          32px a side puts the join at 64, against the comp's 65. Overriding the
          property rather than editing five sections: it cascades, so the two
          `PageBlockSection`s, the Foundations band, `StatsBand` and
          `Certifications` all resolve against it without any of them learning
          that About exists, and no other page inherits it. The `2xl` step keeps
          the token's argument that a very wide screen should be given air, since
          the container cannot be given more width.
        */}
        <div className="[--space-section:2rem] 2xl:[--space-section:2.5rem]">
        {/* "Our Company" in the comp, and the one section of the three that
            uses this component which the comp gives the leaf art to. */}
        <PageBlockSection
          block={blockFor(all, "our_story")}
          id="our-story"
          // Not white. Sampled off the comp left of the text column, this band
          // is rgb(248,248,248) and the Foundations band under it is a deeper,
          // greener rgb(240,243,239) — the two are meant to step apart. We had
          // white over `ground`, which put the step the wrong way round and
          // left the leaf art sitting on a brighter field than the comp draws.
          tone="ground"
          watermark={{ src: "/about-us-our-company-left.png", side: "left" }}
        />

        {foundations.length ? (
          <section
            aria-labelledby="foundations-heading"
            // `ground-warm` rather than `ground`: the comp's Foundations band
            // is rgb(240,243,239) against Our Company's rgb(248,248,248), so
            // it is both deeper and a shade greener. Our two tokens are 247
            // and 244 — a smaller step than the comp's, but the same order.
            className="relative isolate overflow-hidden bg-ground-warm py-(--space-section)"
          >
            {/* On the right here, where the comp puts it — the sprig sits past
                the third card, in the margin outside the container. */}
            <LeafWatermark
              src="/about-us-our-foundation-right-side.png"
              side="right"
              align="middle"
            />

            <div className="relative mx-auto max-w-(--container-max) pl-(--gutter-l) pr-(--gutter-r)">
              <SectionHeading
                block={blockFor(all, "foundations")}
                id="foundations-heading"
                eyebrow="Our Foundations"
                heading="Our Mission, Vision & Values"
              />

              {/* `mt-10` was 40px. The comp sets the cards 17px under the
                  heading's gold rule — 21px here — so this is the one gap
                  inside a band that was as far out as the gaps between them. */}
              <ul className="mt-6 grid gap-6 lg:grid-cols-3">
                {foundations.map((block) => (
                  <FoundationCard key={block.block_key} block={block} />
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {/* Dark, unlike the home page's: the About comp draws this band in
            brand green with white figures. */}
        <StatsBand stats={itemsOf(stats)} label="Rajdhani in numbers" tone="dark" />

        {/* The strength block draws the manufacturing steps beside its text, in
            place of the image a block would otherwise take. Both halves can be
            absent independently: no block and the section does not render at all;
            no steps and the block falls back to its own image. */}
        <PageBlockSection block={blockFor(all, "strength")} id="strength" tone="ground">
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
          // The About comp sets the heading beside the marks, not above them.
          aside
        />
        </div>
      </PageSections>
    </>
  );
}
