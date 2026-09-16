import assert from "node:assert/strict";
import { test } from "node:test";

import { isDirectVideo, toEmbedUrl } from "../src/lib/videoEmbed.js";

test("a YouTube watch URL becomes an embeddable one", () => {
  // This is the whole point: youtube.com/watch refuses to be framed and renders
  // a blank box, which looks exactly like a broken component.
  assert.equal(
    toEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  );
});

test("the share link form works too", () => {
  // youtu.be/<id> is what the Share button gives you, so it is what an editor
  // is most likely to paste.
  assert.equal(
    toEmbedUrl("https://youtu.be/dQw4w9WgXcQ"),
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  );
});

test("extra query parameters do not defeat it", () => {
  // A copied URL usually carries ?t= or ?si=.
  assert.equal(
    toEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s"),
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  );
});

test("an already-embeddable URL is left alone", () => {
  const embed = "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ";
  assert.equal(toEmbedUrl(embed), embed);
});

test("the no-cookie host is used, not the tracking one", () => {
  // The modal only mounts the iframe when opened, and even then it should not
  // set advertising cookies for someone who just watched a product video.
  assert.match(toEmbedUrl("https://youtu.be/dQw4w9WgXcQ"), /youtube-nocookie\.com/);
});

test("Vimeo works as well", () => {
  assert.equal(toEmbedUrl("https://vimeo.com/123456789"), "https://player.vimeo.com/video/123456789");
  assert.equal(toEmbedUrl("https://player.vimeo.com/video/123456789"), "https://player.vimeo.com/video/123456789");
});

test("a direct video file needs no player at all", () => {
  const mp4 = "https://cdn.example.com/tea.mp4";

  assert.equal(toEmbedUrl(mp4), mp4);
  assert.equal(isDirectVideo(mp4), true);
  assert.equal(isDirectVideo("https://youtu.be/dQw4w9WgXcQ"), false);
});

test("anything unrecognised yields null so the caller can open it instead", () => {
  // Showing an empty modal would be worse than sending someone to the page that
  // actually plays the video.
  for (const url of [
    "https://example.com/some-page",
    "https://www.youtube.com/watch?v=tooshort",
    "https://vimeo.com/not-a-number",
    "not a url at all",
    "",
    null,
    undefined,
  ]) {
    assert.equal(toEmbedUrl(url), null, `${url} should not be treated as embeddable`);
  }
});

test("a malformed URL does not throw", () => {
  // video_url is free text an editor typed, so it will eventually be rubbish.
  assert.doesNotThrow(() => toEmbedUrl("http://["));
  assert.equal(toEmbedUrl("http://["), null);
});
