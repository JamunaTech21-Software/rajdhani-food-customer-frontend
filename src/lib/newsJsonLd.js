import { toDate } from "./format.js";

/**
 * `Article` structured data for a news post (§10.4, §14.3).
 *
 * Built here rather than written inline so there is **one** shape: RTPP-71's
 * in-app metadata and RTPP-73's PHP shell renderer should both produce this,
 * not three subtly different versions that disagree about dates or authorship.
 *
 * Pure — no React, no DOM, and **no import of `config.js`**, which reads
 * `import.meta.env` and therefore throws under plain node. The site origin is a
 * parameter instead, so the output can be asserted directly in a test.
 *
 * **Who emits this needs agreeing with the backend.** The shell renderer injects
 * a head server-side for crawlers, which is the better place for it: a crawler
 * that does not run JavaScript never sees a client-rendered block. Until that
 * exists, the app emits it. If both do, a page carries two `Article` blocks
 * describing the same post — tolerated by search engines but untidy, and a
 * standing invitation for the two to drift.
 */

/** ISO 8601, which is what schema.org dates must be. */
const isoDate = (value) => toDate(value)?.toISOString() ?? undefined;

export function articleJsonLd(post, { siteUrl, siteName, logoUrl } = {}) {
  if (!post?.slug || !post?.title || !siteUrl) return null;

  const url = `${siteUrl}/news/${post.slug}`;
  const published = isoDate(post.published_at);

  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    // schema.org caps headline at 110 characters; longer is ignored rather than
    // truncated, so the description carries the detail instead.
    description: post.excerpt ?? undefined,
    url,
    // The canonical identity of the page this describes.
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    datePublished: published,
    // No separate updated_at is exposed publicly, so the two are the same.
    // Omitting dateModified entirely makes an article look never-reviewed.
    dateModified: published,
    image: post.cover_image?.url ? [post.cover_image.url] : undefined,
    keywords: post.tags?.length ? post.tags.join(", ") : undefined,
  };

  if (post.author_name) {
    data.author = { "@type": "Person", name: post.author_name };
  }

  if (siteName) {
    data.publisher = {
      "@type": "Organization",
      name: siteName,
      ...(logoUrl ? { logo: { "@type": "ImageObject", url: logoUrl } } : {}),
    };
  }

  // Undefined keys would serialise as absent anyway, but stripping them keeps
  // the emitted JSON readable when someone inspects the page.
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

/** A breadcrumb trail, which is the other structured data a crawler uses here. */
export function breadcrumbJsonLd(post, { siteUrl } = {}) {
  if (!post?.slug || !post?.title || !siteUrl) return null;

  const crumbs = [
    { name: "Home", item: siteUrl },
    { name: "News", item: `${siteUrl}/news` },
    { name: post.title, item: `${siteUrl}/news/${post.slug}` },
  ];

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.item,
    })),
  };
}
