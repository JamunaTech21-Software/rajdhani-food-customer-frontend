import { useQuery } from "@tanstack/react-query";
import { CircleCheck } from "lucide-react";

import { Certifications } from "../components/content/Certifications.jsx";
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
 */
function AssurancePanel({ block }) {
  if (!block) return null;

  const checklist = bulletsOf(block);

  return (
    <section aria-labelledby="assurance-heading" className="bg-surface pb-(--space-section)">
      <div className="mx-auto max-w-(--container-max) pl-(--gutter-l) pr-(--gutter-r)">
        <div className="grid gap-8 rounded-xl bg-brand-deep p-6 sm:p-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-center lg:gap-12 lg:p-12">
          <PageBlockBody
            block={{ ...block, bullet_points: [] }}
            headingId="assurance-heading"
            className="[&_h2]:text-ink-inverse [&_p]:text-ink-inverse/85 [&>div]:text-ink-inverse/85"
          />

          {checklist.length ? (
            <ul className="space-y-3">
              {checklist.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-ink-inverse">
                  <CircleCheck size={18} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-gold" />
                  {point}
                </li>
              ))}
            </ul>
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

  // The hero is not counted: it has a hardcoded title and renders with or
  // without its banner, so a failed banner is not a failed page.
  const content = [blocks, certifications, commitments, process];
  const state = combineState(content, {
    hasContent: Boolean(
      all.length ||
        itemsOf(commitments).length ||
        itemsOf(process).length ||
        certifications.data?.items?.length,
    ),
  });

  return (
    <>
      <PageHero banner={hero.data?.items?.[0]} title="Quality" breadcrumb="Quality" />

      <PageSections
        state={state}
        error={blocks.error}
        onRetry={() => retryFailed(content)}
        emptyTitle="This page is being prepared"
        emptyBody="Our quality standards and certifications will be published here shortly."
      >

        {/* The six commitment cards sit beside the block's text, where a block
            would otherwise put its image. Absent, the block keeps its own. */}
        <PageBlockSection block={blockFor(all, "commitment")} id="commitment">
          {itemsOf(commitments).length ? <FeatureGrid items={itemsOf(commitments)} /> : undefined}
        </PageBlockSection>

        {itemsOf(process).length ? (
          <section aria-labelledby="quality-process-heading" className="bg-ground py-(--space-section)">
            <div className="mx-auto max-w-(--container-max) pl-(--gutter-l) pr-(--gutter-r)">
              <SectionHeading
                block={blockFor(all, "process")}
                id="quality-process-heading"
                heading="Our Quality Process"
                subheading="Every step is carefully monitored to ensure the highest quality in every cup."
              />

              <ProcessTimeline steps={itemsOf(process)} className="mt-12" />
            </div>
          </section>
        ) : null}

        <Certifications
          items={certifications.data?.items}
          block={blockFor(all, "certifications")}
          heading="Certifications & Standards"
          subheading="We comply with international standards to ensure the best quality and safety."
        />

        <AssurancePanel block={blockFor(all, "assurance")} />
      </PageSections>
    </>
  );
}
