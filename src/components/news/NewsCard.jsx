import { Link } from "react-router";

import { CloudinaryImage } from "../CloudinaryImage.jsx";
import { SIZES } from "../../lib/cloudinary.js";
import { formatDate, toDateTimeAttribute } from "../../lib/format.js";

/**
 * One post in the listing grid (§10.4).
 *
 * Shares its shape with the home page's "Latest updates" band deliberately —
 * they show the same `PublicNewsCard` payload, and two card designs for one
 * object is how the two drift.
 */
export function NewsCard({ post, priority = false }) {
  if (!post?.slug) return null;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface">
      {/*
        A uniform 16/9 crop here is deliberate, even though the payload now
        carries real dimensions: cards sit in a grid, and letting each take its
        own shape would give rows of ragged, mismatched heights. The article
        page shows the cover uncropped instead. The intrinsic size still goes to
        the browser as a loading hint.
      */}
      <div className="aspect-[16/9] overflow-hidden bg-ground">
        <CloudinaryImage
          src={post.cover_image?.url}
          alt={post.cover_image?.alt ?? ""}
          width={post.cover_image?.width}
          height={post.cover_image?.height}
          aspectRatio="16 / 9"
          sizes={SIZES.newsCard}
          priority={priority}
          className="size-full transition-transform duration-(--duration-slow) group-hover:scale-105"
        />
      </div>

      <div className="flex flex-1 flex-col p-5">
        {post.published_at ? (
          <time
            dateTime={toDateTimeAttribute(post.published_at) ?? undefined}
            className="text-xs uppercase tracking-wide text-ink-subtle"
          >
            {formatDate(post.published_at)}
          </time>
        ) : null}

        <h2 className="mt-2 text-lg font-semibold leading-snug text-ink">
          <Link to={`/news/${post.slug}`} className="after:absolute after:inset-0">
            {post.title}
          </Link>
        </h2>

        {post.excerpt ? (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-muted">{post.excerpt}</p>
        ) : null}
      </div>
    </article>
  );
}
