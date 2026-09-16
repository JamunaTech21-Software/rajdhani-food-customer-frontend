/**
 * Turning a video URL an editor pasted into something embeddable.
 *
 * `video_url` on a banner is free text — whatever was in the address bar. The
 * watch page (`youtube.com/watch?v=…`), the share link (`youtu.be/…`) and the
 * embed URL are three different things, and only the last one works in an
 * iframe: the first two refuse to frame and render a blank box.
 *
 * Returns null for anything unrecognised, so the caller can open the link in a
 * new tab instead of showing an empty modal.
 */

const YOUTUBE_ID = /^[\w-]{11}$/;

export function toEmbedUrl(url) {
  const raw = String(url ?? "").trim();
  if (!raw) return null;

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

  // youtu.be/<id>
  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1);
    return YOUTUBE_ID.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    // Already an embed URL — leave it alone rather than rebuilding it.
    if (parsed.pathname.startsWith("/embed/")) return raw;

    const id = parsed.searchParams.get("v");
    return id && YOUTUBE_ID.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }

  if (host === "vimeo.com") {
    const id = parsed.pathname.split("/").filter(Boolean)[0];
    return /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
  }

  if (host === "player.vimeo.com") return raw;

  // A direct file can be played without an iframe at all.
  if (/\.(mp4|webm|ogg)$/i.test(parsed.pathname)) return raw;

  return null;
}

/** Whether the URL points at a video file rather than a hosted player. */
export const isDirectVideo = (url) => /\.(mp4|webm|ogg)(\?|$)/i.test(String(url ?? ""));
