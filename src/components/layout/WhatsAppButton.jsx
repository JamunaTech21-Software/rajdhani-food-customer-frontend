import { SocialIcon } from "../ui/SocialIcon.jsx";
import { useSiteStore } from "../../stores/siteStore.js";

/**
 * The floating WhatsApp button the mobile comp draws over the footer.
 *
 * **Not mounted. Parked on purpose, 2026-09-21** — the client does not want it
 * on the site for now and will say when they do. `SiteLayout` is where it
 * went; re-enabling is one line there and nothing here needs to change.
 *
 * Kept rather than deleted because the file is mostly decisions, not code: the
 * green is a token so an admin changing `primary_color` cannot repaint someone
 * else's brand, the number comes from the social accounts rather than being
 * typed in, and the stacking sits below the drawer. Deleting it would throw
 * those away and they would be re-argued from scratch.
 *
 * **Content-driven, not a hardcoded number.** It renders the `whatsapp` row
 * from the same social accounts the footer lists, so an admin who changes the
 * number changes this too, and an admin who deletes the account removes the
 * button rather than leaving one that opens a dead chat. Nothing renders when
 * there is no such row.
 *
 * `z-40`, below the mobile drawer and the dialogs: a button that floats over an
 * open menu is a button that covers the thing someone is reading.
 *
 * The right offset carries the safe-area inset, like the page gutters, and the
 * bottom offset adds to it rather than replacing it — on a phone with a home
 * indicator the bar sits *below* the button, so `max()` would leave the two
 * touching.
 */
export function WhatsAppButton() {
  const social = useSiteStore((s) => s.social);
  const account = social?.find((row) => row.platform?.toLowerCase().trim() === "whatsapp");

  if (!account?.url) return null;

  return (
    <a
      href={account.url}
      target="_blank"
      rel="noopener noreferrer"
      // Named, because the glyph is the only thing in it. "Chat with us on
      // WhatsApp" rather than "WhatsApp": a screen reader reads the name as
      // the link's purpose, and the purpose is the chat, not the brand.
      aria-label="Chat with us on WhatsApp (opens in a new tab)"
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))] z-40 grid size-14 place-items-center rounded-full bg-whatsapp text-on-whatsapp shadow-raised transition-transform duration-(--duration-fast) hover:scale-105"
    >
      <SocialIcon platform="whatsapp" size={28} />
    </a>
  );
}
