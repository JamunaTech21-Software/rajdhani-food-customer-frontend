import { useQuery } from "@tanstack/react-query";
import { CircleCheck } from "lucide-react";

import { Certifications } from "../components/content/Certifications.jsx";
import { CloudinaryImage } from "../components/CloudinaryImage.jsx";
import { FeatureGrid } from "../components/content/FeatureGrid.jsx";
import { ProcessTimeline } from "../components/content/ProcessTimeline.jsx";
import { SectionHeading } from "../components/content/SectionHeading.jsx";
import { PageBlockBody, PageBlockSection } from "../components/content/PageBlockSection.jsx";
import { PageHero } from "../components/layout/PageHero.jsx";
import { PageSections } from "../components/state/PageSections.jsx";
import {
  blocksOf,
  itemsOf,
  useCertifications,
  useFeatureItems,
  usePageBlocks,
  useProcessSteps,
} from "../hooks/usePageContent.js";
import { useSeo } from "../hooks/useSeo.js";
import { publicApi } from "../lib/api.js";
import { SIZES } from "../lib/cloudinary.js";
import { cn } from "../lib/cn.js";
// TEMPORARY — delete with `lib/contentFixtures.js` once the admin content is
// published. Every use below is a `?? fixture`, never a replacement.
import {
  blockOrFixture,
  FIXTURES_ENABLED,
  orFixture,
  QUALITY_BLOCKS,
  QUALITY_CERTIFICATIONS,
  QUALITY_COMMITMENT_ITEMS,
  QUALITY_HERO_BANNER,
  QUALITY_HERO_LEAD,
  QUALITY_PROCESS_STEPS,
} from "../lib/contentFixtures.js";
import { combineState, retryFailed } from "../lib/loadState.js";
import { blockFor, bulletsOf, PAGE_KEYS } from "../lib/pageContent.js";
import { PAGE_META } from "../lib/seo.js";

/**
 * The closing assurance panel — a block whose bullet list is the checklist
 * beside it, on the deep brand ground the comp draws.
 *
 * `PageBlockBody` renders the bullets as a two-column list under the text; here
 * they belong in their own column, so the block is passed through without them
 * and the list is drawn separately.
 *
 * Three columns rather than two, because the comp gives the photograph one:
 * the picture runs to the panel's own edge on the left, the copy takes the
 * middle, the checklist the right. The image cell carries no padding — that is
 * what "bleeds to the edge" means — and `overflow-hidden` on the panel clips it
 * back to the panel's radius so the corner stays round.
 */
function QualityStamp() {
  // The comp's faint circular seal behind the checklist. Decorative, drawn
  // rather than uploaded: it is two rings and a word, and an asset for that is
  // an asset somebody has to keep in step with the brand colour. Hidden below
  // `lg`, where the panel is a stack and there is no space beside anything for
  // it to sit in without landing on the text.
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      // Hard against the panel's right edge and clipped by it, which is where
      // the comp puts it — a seal stamped on the corner of the band rather
      // than a badge floating beside the checklist. `-z-10` keeps it behind
      // the text; the panel's `overflow-hidden` does the cropping.
      className="pointer-events-none absolute -right-10 top-1/2 -z-10 hidden size-40 -translate-y-1/2 text-ink-inverse/10 lg:block"
    >
      <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="60" cy="60" r="47" fill="none" stroke="currentColor" strokeWidth="1" />
      <text
        x="60"
        y="57"
        textAnchor="middle"
        className="fill-current text-[15px] font-bold tracking-[0.18em]"
      >
        QUALITY
      </text>
      <text
        x="60"
        y="74"
        textAnchor="middle"
        className="fill-current text-[8px] font-semibold tracking-[0.3em]"
      >
        PREMIUM
      </text>
    </svg>
  );
}

/*
  The section headings, sized to stay on one line on a phone.

  At `text-3xl` they do not. This display face runs about 0.41em per character
  — measured three ways off the comp — so "Certifications & Standards" wants
  26 x 0.41 x 30px = 320px and a 320px phone offers 288px of content; inside
  the commitment card, which has its own padding, "Tested Before It Leaves"
  has 248px for 283. Both wrap, and a two-line eyebrow over a one-line one
  reads as a mistake rather than a size.

  A `vw` size fixes it at every width at once rather than at the one I happen
  to check: 7.2vw is 23px at 320 and 27px at 375, both inside what the column
  can hold, and it caps at 30px — exactly today's `text-3xl` — from about
  417px up. So nothing changes on a larger phone, a tablet or a desktop, and
  `sm:text-4xl` is never touched.

  `max-sm:` and the descendant `[&_h2]` together are what make this safe. The
  variant keeps it below 640 only, so it cannot reach the `sm:` size above;
  the descendant selector is specificity (0,1,1) against the heading's own
  (0,1,0), so below 640 it wins on specificity rather than on where Tailwind
  happened to emit it. Written as a second font size *on* the `h2` it would be
  a tie, and ties are decided by the stylesheet's order, not the attribute's.

  Written out in full rather than composed from parts: Tailwind finds classes
  by scanning the source for complete names, and a template literal would
  produce a class that never gets generated.
*/
const MOBILE_SECTION_HEADING = "max-sm:[&_h2]:text-[clamp(1.25rem,7.2vw,1.875rem)]";

/*
  This page's headings are green, not ink.

  Histogramming the dark pixels of the comp's headings — "Our Quality Process"
  and "Our Commitment to Quality" — puts both at #004008 to #004010, which is
  `--color-brand-deep` (#0d3411) to within a few digits. `SectionHeading` and
  `PageBlockBody` both default to `text-ink` (#1a1a1a), a neutral near-black,
  and at 30px of Playfair the difference between a near-black and a deep green
  is not subtle.

  Not a change to those components: About's comp *does* set its headings in
  ink, so this is one page's palette rather than a correction to theirs.

  The two sets of card titles go with them. The commitment grid's sample at
  #072612 and the process steps' at #205030 are both the brand green rather
  than `brand-deep` — a lighter green for smaller type, which is the usual way
  round. Certification names stay ink: those sample #2B2E2F, genuinely neutral.

  `[&_h2]` and `[&_h3]` are descendant selectors, so they win on specificity
  (0,1,1) against the heading's own class (0,1,0) rather than on emission
  order.
*/
const SECTION_HEADING_INK = "[&_h2]:text-brand-deep";
const CARD_TITLE_INK = "[&_[data-feature-title]]:text-brand";
const STEP_TITLE_INK = "[&_h3]:text-brand";

/* The assurance panel's heading is longer (31 characters) and its column has
   the panel's padding as well, so it needs its own, smaller figure: 5.4vw is
   17px at 320 and 20px at 375, against the 19px and 23px those widths allow. */
const MOBILE_PANEL_HEADING = "max-sm:[&_h2]:text-[clamp(1rem,5.4vw,1.5rem)]";

function AssurancePanel({ block }) {
  if (!block) return null;

  const checklist = bulletsOf(block);
  const image = block.image;

  return (
    // `pt` as well as `pb`. The certifications band's own padding is inside
    // its pale ground, so the band's edge *is* its section's edge — with no
    // top padding here the dark panel butted straight onto it. The comp
    // leaves a band of page white between the two.
    <section
      aria-labelledby="assurance-heading"
      className="bg-surface pb-(--space-section) pt-(--space-section)"
    >
      <div className="mx-auto max-w-(--container-max) pl-(--gutter-l) pr-(--gutter-r)">
        <div
          className={cn(
            // `rounded-lg`, not `xl`: the comp's corner measures about 7px on
            // a 959px-wide panel. The panel colour samples #073716 across the
            // band, which is `--color-brand-deep` (#0d3411) to within a couple
            // of digits — so the token is already the comp's green.
            "relative isolate grid overflow-hidden rounded-lg bg-brand-deep [&>*]:min-w-0",
            // `items-stretch`, not `items-center`: the photograph's cell has to
            // be the height of the row for the image to fill it. The text and
            // the checklist centre themselves inside their own cells instead.
            image?.url
              ? // Measured off the comp: scanning a row of pixels across the
                // band, the photograph is fully opaque to about 17% of the
                // panel's width and has dissolved into the green by 26%. So
                // the cell is ~26%, not the ~31% the eye reads off the render
                // — the last third of it is fade, not picture. The stamp is
                // absolutely positioned, so it costs the third column nothing
                // and that column only has to hold four short lines.
                "lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.3fr)_minmax(0,1fr)] lg:items-stretch"
              : "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-center",
          )}
        >
          {image?.url ? (
            // The ratio lives on the wrapper, not on the image: `aspectRatio`
            // is an inline style and cannot be changed at a breakpoint, and
            // this box is 16/9 on a phone and the full height of the row at
            // `lg`. `object-cover` inside it means neither shape distorts.
            <div className="relative aspect-[16/9] w-full sm:aspect-[21/9] lg:aspect-auto lg:h-full">
              <CloudinaryImage
                src={image.url}
                alt={image.alt ?? ""}
                sizes={SIZES.half}
                className="size-full"
              />

              {/*
                Not a scrim over the picture — a dissolve into the panel.

                I had this backwards: a flat wash darkened the whole photograph,
                where sampling the comp shows the opposite. Its left side is at
                natural brightness (the lab coat reads #8A9194, near white) and
                it is the *right* edge that disappears, reaching the panel green
                by about two thirds across the cell. So the picture has no hard
                edge against the green at all; it fades out into it.

                Only at `lg`. Below it the photograph is a full-width banner
                above the copy, and a fade to green across a phone-width image
                would read as a rendering fault rather than a join.
              */}
              <span
                aria-hidden="true"
                className="absolute inset-0 hidden lg:block lg:bg-gradient-to-r lg:from-transparent lg:from-60% lg:to-brand-deep lg:to-100%"
              />
            </div>
          ) : null}

          <div
            className={cn(
              "flex flex-col justify-center px-6 pb-6 pt-7 sm:px-8 lg:py-9",
              image?.url ? "lg:pl-10" : null,
            )}
          >
            <PageBlockBody
              block={{ ...block, bullet_points: [] }}
              headingId="assurance-heading"
              ornament="center"
              /*
                Centred heading with the gold flourish under it, and the
                paragraph left-aligned beneath both — that is how the comp sets
                this band, and the mixture is deliberate rather than an
                inconsistency: the heading is a banner line across the panel,
                the paragraph is three lines of prose that would be harder to
                read ragged on both sides.

                Every one of these three is pure #FFFFFF in the comp — the
                heading, the body and the checklist alike. The body was at 85%,
                which is the convention on a photographic hero where the copy
                sits on an unpredictable background; on a flat brand panel the
                comp just uses white.

                **The heading is sized to stay on one line.** Measuring it off
                the comp — 302px across a 959px-wide render of a 1280 design,
                31 characters — this display face runs about 0.41em per
                character, so the line wants ~381px at 30px. From `lg` the
                middle column is 1.3 of 3.15 tracks less 72px of padding, which
                is 331px at 1024 and 436px at 1280: a flat `text-3xl` fits the
                second and breaks on the first, which is the wrap you saw.
                Widening the column does not rescue 1024 either — it would have
                to take half the panel.

                So the size follows the column instead. `2.2vw` is ~22.5px at
                1024 (needs 286 of 331) and caps at 28px from ~1270 (needs 356
                of 436), which holds one line across the whole desktop range
                with room for the measurement to be off. Below `lg` the panel
                is a single stacked column with far more room, so it steps back
                to fixed sizes; one line holds there to about 360px, and a
                320px phone takes two, which is the right answer at that width.

                Not `whitespace-nowrap`: that does not keep a line on one line,
                it just moves the failure from a wrap to a horizontal scrollbar.
              */
              className={cn(
                MOBILE_PANEL_HEADING,
                "text-center [&_p]:text-ink-inverse [&_h2]:text-ink-inverse sm:[&_h2]:text-2xl lg:[&_h2]:text-[clamp(1.25rem,2.2vw,1.75rem)] [&>div]:text-left [&>div]:text-sm [&>div]:leading-relaxed [&>div]:text-ink-inverse",
              )}
            />
          </div>

          {checklist.length ? (
            <div className="relative flex flex-col justify-center px-6 pb-8 sm:px-8 lg:py-9 lg:pl-0 lg:pr-10">
              <QualityStamp />

              {/*
                The comp draws a hairline inside this list — above the last
                item, which with its four entries falls between "Expert Quality
                Team" and "Continuous Improvement". It samples #6A8869, white
                at about 38% over the panel.

                `nth-child(n+4):last-child` rather than a fixed position,
                because the list is editor-written and its length is not ours
                to assume: the rule lands above the final item exactly as the
                comp draws it at four, follows it to five or six, and does not
                appear at all on a short list where a divider before the last
                of two or three would be noise.
              */}
              <ul className="space-y-3 [&>li:nth-child(n+4):last-child]:border-t [&>li:nth-child(n+4):last-child]:border-ink-inverse/30 [&>li:nth-child(n+4):last-child]:pt-4">
                {checklist.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm font-semibold text-ink-inverse">
                    <CircleCheck size={18} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-brand-tint" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/**
 * The Quality page (§10.4).
 *
 * Same arrangement as About: every section is a `PageBlock` or a
 * `Certification` row, so all of it is editable from Page Content and none of
 * the copy is in this bundle.
 *
 * **Two of the comp's sections have no public data source.** The six commitment
 * cards need `FeatureItem` in section `QUALITY_COMMITMENT` and the five-step
 * strip needs `ProcessStep` in group `QUALITY_PROCESS` — neither is exposed
 * publicly, and neither has rows in the database yet either. The commitment
 * block's own text and its checklist *do* exist (`quality/commitment`, with
 * four bullet points), so that half of the section renders as soon as
 * `/public/page-blocks/{pageKey}` does.
 */
export function QualityPage() {
  const hero = useQuery({
    queryKey: ["public", "banners", "QUALITY_HERO"],
    queryFn: () => publicApi.list("/public/banners", { params: { placement: "QUALITY_HERO" } }),
    staleTime: 5 * 60_000,
  });

  useSeo(PAGE_META.quality);

  const blocks = usePageBlocks(PAGE_KEYS.quality);
  const certifications = useCertifications();
  const commitments = useFeatureItems("QUALITY_COMMITMENT");
  const process = useProcessSteps("QUALITY_PROCESS");

  const all = blocksOf(blocks);

  /*
    Every section resolved against its stand-in — see `contentFixtures.js`.

    The API's own rows win whenever it sent any, so each of these becomes a
    plain pass-through the moment an editor publishes the real content, and the
    cleanup is deleting this block along with the import. Nothing below this
    point knows which of the two it is rendering, which is the point: the
    layout cannot come to depend on the fixture's exact copy.
  */
  const banner = hero.data?.items?.[0] ?? (FIXTURES_ENABLED ? QUALITY_HERO_BANNER : undefined);
  const commitmentItems = orFixture(itemsOf(commitments), QUALITY_COMMITMENT_ITEMS);
  const processSteps = orFixture(itemsOf(process), QUALITY_PROCESS_STEPS);
  const certificationItems = orFixture(certifications.data?.items, QUALITY_CERTIFICATIONS);

  const commitmentBlock = blockOrFixture(blockFor(all, "commitment"), QUALITY_BLOCKS.commitment);
  const processBlock = blockOrFixture(blockFor(all, "process"), QUALITY_BLOCKS.process);
  const certificationsBlock = blockOrFixture(
    blockFor(all, "certifications"),
    QUALITY_BLOCKS.certifications,
  );
  const assuranceBlock = blockOrFixture(blockFor(all, "assurance"), QUALITY_BLOCKS.assurance);

  // The hero is not counted: it has a hardcoded title and renders with or
  // without its banner, so a failed banner is not a failed page.
  const content = [blocks, certifications, commitments, process];
  const state = combineState(content, {
    hasContent: Boolean(
      all.length ||
        commitmentItems.length ||
        processSteps.length ||
        certificationItems.length ||
        assuranceBlock,
    ),
  });

  return (
    <>
      <PageHero
        banner={banner}
        title="Quality"
        breadcrumb="Quality"
        // Fixture copy, so it is gated like the banner rather than passed
        // unconditionally — there is no banner column behind it, and a
        // production build must not print invented copy under a real photo.
        lead={FIXTURES_ENABLED ? QUALITY_HERO_LEAD : undefined}
        ornament
      />

      <PageSections
        state={state}
        error={blocks.error}
        onRetry={() => retryFailed(content)}
        emptyTitle="This page is being prepared"
        emptyBody="Our quality standards and certifications will be published here shortly."
      >

        {/* The six commitment cards sit beside the block's text, where a block
            would otherwise put its image. Absent, the block keeps its own. */}
        {/*
          The Quality comp's rhythm, which is much tighter than the site's.

          Measuring the reference — a 1029px render of a 1280 design, so ×1.244
          — the bands sit 24 to 25px apart: hero to the commitment card 24, the
          card to the process heading 25, the process cards to the
          certifications band 24, and 14 between certifications and the
          assurance panel. The site's `--space-section` is 64px at this width
          and every section carries it top *and* bottom, so two neighbours put
          128px between them. That is the gap you were looking at.

          Overriding the property rather than passing padding props down: it is
          a custom property, so it cascades, and `py-(--space-section)` inside
          `PageBlockSection` and `Certifications` resolves against this value
          without either component learning that the Quality page exists. No
          other page inherits it, and the rhythm is still read from one place
          rather than re-typed per section.

          20px a side gives 40px between bands against the comp's 24–25. Not
          the exact figure: these are measurements off a low-resolution render,
          and the comp's own bands are drawn tighter than anything else on this
          site. This is the number to change if it wants to be tighter still.
        */}
        <div className="[--space-section:1.5rem] lg:[--space-section:1.25rem]">
        <PageBlockSection
          block={commitmentBlock}
          id="commitment"
          framed
          ornament
          bodyClassName={cn(MOBILE_SECTION_HEADING, SECTION_HEADING_INK)}
        >
          {commitmentItems.length ? (
            // Three across at `lg`, as the comp draws them, with its hairline
            // rules between the cells.
            //
            // The marks are solid brand discs with a light glyph rather than
            // the home strip's pale washes. Through `markClassName` and the
            // tokens, not through the fixture's `icon_bg_color`: a hex in the
            // fixture would be a colour that survives an admin changing
            // `primary_color`, and it would also be overridden the moment an
            // editor sets that field on the real row — so the design would
            // depend on data nobody has entered yet. An editor who does set a
            // colour still wins here, because `markStyle` writes it inline.
            //
            // `size-9` shrinks the disc from 44px, which is a size that
            // belongs to a full-width grid rather than to six cells sharing
            // half a card.
            <FeatureGrid
              items={commitmentItems}
              columns="sm:grid-cols-2 lg:grid-cols-3"
              className={CARD_TITLE_INK}
              markClassName="size-9 bg-brand text-on-brand sm:size-10"
              ruled
            />
          ) : undefined}
        </PageBlockSection>

        {processSteps.length ? (
          <section aria-labelledby="quality-process-heading" className="bg-ground py-(--space-section)">
            <div className="mx-auto max-w-(--container-max) pl-(--gutter-l) pr-(--gutter-r)">
              <SectionHeading
                block={processBlock}
                id="quality-process-heading"
                className={cn(MOBILE_SECTION_HEADING, SECTION_HEADING_INK)}
                heading="Our Quality Process"
                subheading="Every step is carefully monitored to ensure the highest quality in every cup."
              />

              <ProcessTimeline
                steps={processSteps}
                variant="card"
                className={cn("mt-10 sm:mt-12", STEP_TITLE_INK)}
              />
            </div>
          </section>
        ) : null}

        <Certifications
          items={certificationItems}
          block={certificationsBlock}
          heading="Certifications & Standards"
          subheading="We comply with international standards to ensure the best quality and safety."
          headingClassName={cn(MOBILE_SECTION_HEADING, SECTION_HEADING_INK)}
          columns="lg:grid-cols-6"
        />

        <AssurancePanel block={assuranceBlock} />
        </div>
      </PageSections>
    </>
  );
}
