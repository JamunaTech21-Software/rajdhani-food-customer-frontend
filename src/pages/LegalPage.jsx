import { Link } from "react-router";

import { RichText } from "../components/content/RichText.jsx";
import { PageHero } from "../components/layout/PageHero.jsx";
import { ErrorState } from "../components/state/StatePanel.jsx";
import { useSeo } from "../hooks/useSeo.js";
import { blocksOf, usePageBlocks } from "../hooks/usePageContent.js";
import { legalDocument, showContents } from "../lib/pageContent.js";
import { PAGE_META } from "../lib/seo.js";

/**
 * The contents list.
 *
 * Only `h2`s: a policy's `h3`s are sub-clauses, and a list that includes them is
 * long enough that finding the clause in it is the same work as finding it in
 * the document. Plain in-page links, so a right-click gives a shareable URL to
 * the clause — which is the point of anchors on a page like this.
 */
function Contents({ headings }) {
  return (
    <nav aria-labelledby="contents-heading" className="rounded-xl border border-line bg-ground p-5">
      <h2 id="contents-heading" className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
        On this page
      </h2>

      <ol className="mt-3 space-y-2">
        {headings
          .filter((heading) => heading.level === 2)
          .map((heading) => (
            <li key={heading.id}>
              <a href={`#${heading.id}`} className="text-sm text-ink-muted hover:text-brand hover:underline">
                {heading.text}
              </a>
            </li>
          ))}
      </ol>
    </nav>
  );
}

/**
 * Privacy Policy and Terms of Service (§10.4).
 *
 * One component for both: they are the same page with a different `page_key`,
 * and the keys are the backend's own — `privacy` and `terms`, as `SeoMetaSeeder`
 * spells them and as the live `legal` menu links them.
 *
 * The second acceptance criterion is this page's typography and anchor links.
 * Heading ids are derived from the heading text rather than stored, because an
 * editor writing in TipTap has no way to set one — and they are derived
 * deterministically, so a link to a clause shared last month still lands on it.
 *
 * **No content exists yet.** There are no `privacy` or `terms` blocks in the
 * database and no `GET /public/page-blocks/{pageKey}` to fetch them with, so
 * today this renders its heading and says plainly that the text is not
 * published — which is the honest state, and better than the 404 that the
 * footer's two legal links currently give on every page of the site.
 */
export function LegalPage({ pageKey, title }) {
  const blocks = usePageBlocks(pageKey);
  const { html, headings } = legalDocument(blocksOf(blocks));

  useSeo({ title, description: PAGE_META[pageKey]?.description });

  return (
    <>
      <PageHero title={title} breadcrumb={title} />

      <div className="mx-auto max-w-3xl py-12 pl-(--gutter-l) pr-(--gutter-r)">
        {blocks.isPending ? (
          <div role="status" aria-label={`Loading ${title}`} aria-busy="true" className="space-y-3">
            <div className="h-4 w-40 animate-pulse rounded bg-ground" />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-3.5 w-full animate-pulse rounded bg-ground" />
            ))}
          </div>
        ) : blocks.isError ? (
          // Before the "not published yet" branch below, and the reason this
          // distinction is worth the extra case: during an outage that message
          // would tell a visitor the company has no privacy policy, which is a
          // very different statement from "we could not fetch it".
          <ErrorState
            error={blocks.error}
            title={`We could not load our ${title.toLowerCase()}`}
            onRetry={() => blocks.refetch()}
          />
        ) : html ? (
          <>
            {showContents(headings) ? (
              <div className="mb-10">
                <Contents headings={headings} />
              </div>
            ) : null}

            <RichText html={html} />
          </>
        ) : (
          <div className="rounded-xl border border-line bg-ground p-6 text-center sm:p-8">
            <p className="font-display text-lg font-semibold text-ink">
              This page has not been published yet
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
              Our {title.toLowerCase()} is being prepared. Please get in touch if you need it in the
              meantime.
            </p>
            <Link
              to="/contact"
              className="mt-6 inline-flex h-11 items-center rounded-md bg-brand px-5 text-sm font-medium text-on-brand"
            >
              Contact us
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
