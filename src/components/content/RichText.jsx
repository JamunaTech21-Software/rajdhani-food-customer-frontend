import { cn } from "../../lib/cn.js";
import { PROSE } from "../../lib/prose.js";

/**
 * `scroll-mt-24` in PROSE is what makes an anchor link usable: the header is
 * sticky, so a heading scrolled to the top of the viewport sits underneath it.
 *
 * `html` is set as HTML because the API has **already sanitised it**
 * server-side (`RichText::sanitize()`, HTML Purifier — §14.2). Sanitising again
 * in the browser would be theatre: the server is the authority, and a second
 * pass here protects nothing an attacker could not simply skip.
 */
export function RichText({ html, className }) {
  if (!html) return null;

  return <div className={cn(PROSE, className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
