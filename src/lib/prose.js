/**
 * Typography for editor-written rich text.
 *
 * Long-form content arrives as bare `h2`/`h3`/`ul`/`ol`/`blockquote`/`p` — a
 * news article, a privacy policy, the body of a page block. Unstyled it renders
 * as one undifferentiated wall, which is the usual way long copy becomes
 * unreadable. Measure and vertical rhythm do most of the work; the rest is
 * making sure a heading looks like one.
 *
 * One set of rules rather than one per page: the same payload rendered two ways
 * is two things to keep in step, and the second one always falls behind.
 */
export const PROSE = [
  "text-base leading-relaxed text-ink-muted",
  "[&_a]:text-brand [&_a]:underline",
  "[&_p+p]:mt-4",
  "[&_h2]:mt-10 [&_h2]:scroll-mt-(--scroll-offset) [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-ink",
  "[&_h3]:mt-6 [&_h3]:scroll-mt-(--scroll-offset) [&_h3]:font-display [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-ink",
  "[&_ul]:mt-4 [&_ol]:mt-4 [&_li]:ml-5 [&_li]:list-disc [&_li+li]:mt-1.5 [&_ol_li]:list-decimal",
  "[&_blockquote]:border-l-4 [&_blockquote]:border-brand-tint [&_blockquote]:pl-4 [&_blockquote]:italic",
  "[&_img]:my-6 [&_img]:rounded-lg",
  "[&_table]:mt-4 [&_table]:w-full [&_td]:border [&_td]:border-line [&_td]:p-2 [&_th]:border [&_th]:border-line [&_th]:p-2",
].join(" ");
