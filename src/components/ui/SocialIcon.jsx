import { Globe } from "lucide-react";

import { socialMark } from "./social-marks.js";

/**
 * A social brand mark, falling back to a globe.
 *
 * `platform` is free text in the database (VARCHAR(64), not an enum), so an
 * unrecognised value is expected rather than exceptional. It still links,
 * instead of rendering nothing and silently dropping an account an admin just
 * added.
 */
export function SocialIcon({ platform, size = 16, className }) {
  const path = socialMark(platform);

  if (!path) {
    return <Globe size={size} strokeWidth={1.75} aria-hidden="true" className={className} />;
  }

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d={path} />
    </svg>
  );
}
