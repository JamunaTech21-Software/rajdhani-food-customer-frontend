import { useQuery } from "@tanstack/react-query";

import { ApiError, ErrorCode } from "@shared/api/errors.js";

import { publicApi } from "../lib/api.js";

/**
 * The content behind the static pages — and the one part of them that is
 * waiting on the backend.
 *
 * `GET /public/page-blocks/{pageKey}` and `GET /public/certifications` do not
 * exist yet. Both resources have full admin CRUD (`/admin/page-blocks`,
 * `/admin/certifications`) and real rows in the database — `about/our_story`,
 * `about/mission`, `about/vision`, `quality/commitment`, and three
 * certifications — but nothing public serves them. `/public/home`'s own
 * description says as much: *"The fuller standalone public-exposure backlog for
 * these two resources is still open."*
 *
 * So the pages are built and every section renders from data; the sections
 * whose data has no route are simply absent until it exists. A 404 is treated
 * as "no content", not as an error — the page still has its banner, its heading
 * and whatever else did arrive, rather than an error screen for a route that
 * was never wired up.
 *
 * The shapes are the ones the schema already documents and `/public/home`
 * already serves: `HomeWelcomeBlock` for a block, `Certification` for a mark.
 * When the endpoints land this file is the only thing that should need to move.
 */
const isMissing = (error) =>
  error instanceof ApiError && (error.code === ErrorCode.NOT_FOUND || error.status === 404);

const emptyOnMissing = async (request) => {
  try {
    return await request();
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
};

/** Every published block on one page, keyed by `block_key`. */
export function usePageBlocks(pageKey) {
  return useQuery({
    queryKey: ["public", "page-blocks", pageKey],
    queryFn: () =>
      emptyOnMissing(() => publicApi.list(`/public/page-blocks/${encodeURIComponent(pageKey)}`)),
    enabled: Boolean(pageKey),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useCertifications() {
  return useQuery({
    queryKey: ["public", "certifications"],
    queryFn: () => emptyOnMissing(() => publicApi.list("/public/certifications")),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

/** The blocks as a plain array, whatever the endpoint did. */
export const blocksOf = (query) => query.data?.items ?? [];

/**
 * The three section resources, each filtered to one group (§10.4).
 *
 * All three arrived with RTPP-67's backend update. The `section` and `group`
 * parameters are **required** by the API — an absent or unrecognised one is a
 * 422, not an empty list, which is the right way round: a typo in a section
 * name surfaces instead of looking like "nobody has written this yet".
 *
 * They are separate hooks rather than one, because the three pages that use
 * them want different groups and a combined call would fetch what it did not
 * need on every one of them.
 */
const sectionQuery = (key, path, value) => ({
  queryKey: ["public", key, value],
  queryFn: () => emptyOnMissing(() => publicApi.list(path)),
  enabled: Boolean(value),
  staleTime: 5 * 60_000,
  retry: false,
});

/** `FeatureItem` rows — `HOME_USP`, `ABOUT_VALUES`, `QUALITY_COMMITMENT`, … */
export function useFeatureItems(section) {
  return useQuery(
    sectionQuery("feature-items", `/public/feature-items?section=${encodeURIComponent(section)}`, section),
  );
}

/** `ProcessStep` rows — `MANUFACTURING_PROCESS`, `QUALITY_PROCESS`, … */
export function useProcessSteps(group) {
  return useQuery(
    sectionQuery("process-steps", `/public/process-steps?group=${encodeURIComponent(group)}`, group),
  );
}

/** `StatCounter` rows — `HOME`, `ABOUT`, `DEALER_NETWORK`, … */
export function useStats(group) {
  return useQuery(sectionQuery("stats", `/public/stats?group=${encodeURIComponent(group)}`, group));
}

/** The rows, as a plain array, whatever the endpoint did. */
export const itemsOf = (query) => query.data?.items ?? [];
