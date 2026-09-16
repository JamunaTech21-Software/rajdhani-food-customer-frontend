/**
 * The download keys the customer site links against (§11, RTPP-51).
 *
 * `/public/downloads/{key}` resolves by a stable, admin-chosen key rather than
 * an id, precisely so the front end can be built against a known name — the
 * file behind it can be replaced any number of times without touching this.
 *
 * **None of these exist yet.** Every key below currently 404s, which is why
 * every button that uses one is hidden rather than dead. Someone needs to
 * create the matching rows in the dashboard's Downloads screen, spelled exactly
 * as written here.
 */
export const DOWNLOAD_KEYS = {
  productBrochure: "product_brochure",
  dealerBrochure: "dealer_brochure",
  productCatalogue: "product_catalogue",
};
