import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { Link, useParams } from "react-router";

import { CloudinaryImage } from "../components/CloudinaryImage.jsx";
import { RichText } from "../components/content/RichText.jsx";
import { SITE_URL } from "../config.js";
import { publicApi } from "../lib/api.js";
import { SIZES } from "../lib/cloudinary.js";
import { formatDate, toDateTimeAttribute } from "../lib/format.js";
import { articleJsonLd, breadcrumbJsonLd } from "../lib/newsJsonLd.js";
import { useSiteStore } from "../stores/siteStore.js";

/**
 * Structured data, emitted as a script tag.
 *
 * `dangerouslySetInnerHTML` is the only way to put raw JSON inside a script
 * element — React escapes text children, which would produce `&quot;` and an
 * unparseable block. The content is our own serialised object, not user input.
 * `<` is escaped anyway, since a `</script>` inside a string would close the
 * tag early and break the page.
 */
function JsonLd({ data }) {
  if (!data) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

function Neighbour({ post, direction }) {
  // `previous` is the *older* post and `next` the *newer* one — the API's own
  // wording. Following its naming keeps the two sides from being inverted.
  const older = direction === "previous";

  if (!post?.slug) {
    // A missing neighbour is one end of the list. An empty cell keeps the other
    // side in place rather than letting it slide across.
    return <span aria-hidden="true" />;
  }

  return (
    <Link
      to={`/news/${post.slug}`}
      className={`group flex flex-col gap-1 rounded-xl border border-line p-5 hover:border-brand ${older ? "" : "sm:text-right"}`}
    >
      <span className={`flex items-center gap-1.5 text-sm text-ink-muted ${older ? "" : "sm:justify-end"}`}>
        {older ? <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" /> : null}
        {older ? "Older" : "Newer"}
        {older ? null : <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />}
      </span>
      <span className="font-display font-semibold text-ink group-hover:text-brand">{post.title}</span>
    </Link>
  );
}

/**
 * A news article (§10.4).
 *
 * `previous` and `next` come from the API, which computes them in publish order
 * and returns null at each end — so the second acceptance criterion is the
 * backend's guarantee, and this page's job is only to render both ends honestly.
 *
 * Note `view_count` is incremented **by the request itself**, so this page is
 * deliberately not set to refetch on focus or mount: every extra fetch would be
 * another counted view.
 */
export function NewsArticlePage() {
  const { slug } = useParams();
  const site = useSiteStore((s) => s.site);

  const query = useQuery({
    queryKey: ["public", "news", slug],
    queryFn: () => publicApi.get(`/public/news/${encodeURIComponent(slug)}`),
    enabled: Boolean(slug),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const post = query.data;

  if (query.isPending) {
    return (
      <div role="status" aria-label="Loading article" aria-busy="true" className="mx-auto max-w-3xl py-12 pl-(--gutter-l) pr-(--gutter-r)">
        <div className="h-4 w-40 animate-pulse rounded bg-ground" />
        <div className="mt-4 h-10 w-full animate-pulse rounded bg-ground" />
        <div className="mt-8 aspect-[16/9] animate-pulse rounded-xl bg-ground" />
      </div>
    );
  }

  if (query.isError || !post) {
    return (
      <div className="mx-auto max-w-lg py-24 text-center pl-(--gutter-l) pr-(--gutter-r)">
        <h1 className="font-display text-2xl font-bold text-ink">We could not find that article</h1>
        <p className="mt-2 text-ink-muted">It may have been unpublished or renamed.</p>
        <Link
          to="/news"
          className="mt-6 inline-flex h-11 items-center rounded-md bg-brand px-5 text-sm font-medium text-on-brand"
        >
          All news
        </Link>
      </div>
    );
  }

  const context = { siteUrl: SITE_URL, siteName: site?.name, logoUrl: site?.logos?.light?.url };

  return (
    <article className="mx-auto max-w-3xl pb-16 pl-(--gutter-l) pr-(--gutter-r)">
      <JsonLd data={articleJsonLd(post, context)} />
      <JsonLd data={breadcrumbJsonLd(post, context)} />

      <nav aria-label="Breadcrumb" className="py-5">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
          <li>
            <Link to="/" className="hover:text-brand">
              Home
            </Link>
          </li>
          <li className="flex items-center gap-1.5">
            <ChevronRight size={13} strokeWidth={2} aria-hidden="true" className="text-ink-subtle" />
            <Link to="/news" className="hover:text-brand">
              News
            </Link>
          </li>
        </ol>
      </nav>

      <header>
        <h1 className="font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
          {post.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-muted">
          {post.published_at ? (
            <time dateTime={toDateTimeAttribute(post.published_at) ?? undefined}>
              {formatDate(post.published_at)}
            </time>
          ) : null}
          {post.author_name ? <span>By {post.author_name}</span> : null}
        </div>

        {post.tags?.length ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-brand-tint px-3 py-1 text-xs font-medium capitalize text-brand"
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      {post.cover_image?.url ? (
        <div className="mt-8 overflow-hidden rounded-xl bg-ground">
          {/*
            The cover's real shape, now that the payload carries `width` and
            `height`. Forcing 16/9 here would crop a portrait or square cover —
            acceptable in a uniform card grid, but not for the one large image
            at the top of the article it belongs to. Falls back to 16/9 for any
            cover still without dimensions.
          */}
          <CloudinaryImage
            src={post.cover_image.url}
            alt={post.cover_image.alt ?? ""}
            width={post.cover_image.width}
            height={post.cover_image.height}
            aspectRatio={
              post.cover_image.width > 0 && post.cover_image.height > 0
                ? `${post.cover_image.width} / ${post.cover_image.height}`
                : "16 / 9"
            }
            sizes={SIZES.article}
            priority
            className="size-full"
            imgClassName="object-contain"
          />
        </div>
      ) : null}

      {/*
        Sanitised server-side (`RichText::sanitize()`), as the schema says.

        The prose styling is the first acceptance criterion: long-form content
        has to stay legible at every width, which is mostly measure and rhythm.
        max-w-prose caps the line length, and RichText carries the heading, list
        and blockquote rules that stop an article rendering as one wall — shared
        with the legal pages, which have the same problem at greater length.
      */}
      <RichText html={post.content} className="mt-8 max-w-prose" />

      {post.previous || post.next ? (
        <nav aria-label="More articles" className="mt-14 grid gap-4 border-t border-line pt-8 sm:grid-cols-2">
          <Neighbour post={post.previous} direction="previous" />
          <Neighbour post={post.next} direction="next" />
        </nav>
      ) : null}

      <div className="mt-10">
        <Link to="/news" className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline">
          <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
          All news
        </Link>
      </div>
    </article>
  );
}
