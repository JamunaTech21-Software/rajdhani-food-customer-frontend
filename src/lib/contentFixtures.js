/**
 * TEMPORARY design fixtures — delete this file once the admin content is in.
 *
 * The Quality page's comp draws six sections; four of them read resources that
 * are published but still empty on the live API:
 *
 *   * `banners?placement=QUALITY_HERO`            → []
 *   * `feature-items?section=QUALITY_COMMITMENT`  → []
 *   * `process-steps?group=QUALITY_PROCESS`       → []
 *   * `page-blocks/quality` → only `commitment` exists; `process`,
 *     `certifications` and `assurance` do not.
 *   * `page-blocks/gallery` and `stats?group=GALLERY` → both `[]`, which is
 *     the Gallery comp's closing strip.
 *
 * So those pages render a fraction of what they are meant to and there is
 * nothing to design against. These rows stand in until an editor writes the
 * real ones.
 *
 * **Real data always wins.** `orFixture` returns the API's rows whenever the
 * API sent any, so the moment a row is published through the admin panel the
 * fixture for it stops being read — there is no switch to remember to flip and
 * no redesign to do. Deleting this file and the handful of `orFixture` calls in
 * `QualityPage` is the whole of the cleanup.
 *
 * The shapes are the API's own, field for field: `PublicBanner`,
 * `PublicFeatureItem`, `PublicProcessStep`, `PublicPageBlock` and
 * `PublicCertification` in `backend/api/docs/openapi.yaml`. Anything that
 * renders from a fixture therefore renders identically from the endpoint.
 */

import { CONTENT_FIXTURES } from "../config.js";

/**
 * Whether the stand-in rows are used at all — see `CONTENT_FIXTURES` in
 * `config.js`, which is the only module allowed to read `import.meta.env`.
 */
export const FIXTURES_ENABLED = CONTENT_FIXTURES;

/**
 * The API's rows if it sent any, the stand-ins if it did not.
 *
 * Deliberately all-or-nothing per resource rather than merged. A page that
 * showed two real process steps followed by three invented ones would be
 * misleading in a way that showing none is not.
 */
export function orFixture(items, fixture) {
  if (Array.isArray(items) && items.length > 0) return items;
  return FIXTURES_ENABLED ? fixture : items ?? [];
}

/** One block out of `blocks`, falling back to the stand-in of the same key. */
export function blockOrFixture(block, fixture) {
  if (block) return block;
  return FIXTURES_ENABLED ? fixture : null;
}

/*
 * Images are real assets from this project's own Cloudinary account rather
 * than an external placeholder service: `CloudinaryImage` builds a `srcSet`
 * only for URLs it recognises, so a picsum or unsplash URL would render at one
 * fixed width and misrepresent how the real thing behaves. They are the wrong
 * *subjects* — these are banner and news photographs — which is the point of a
 * placeholder, and they will be replaced with the real uploads.
 */
const CDN = "https://res.cloudinary.com/c3mbbtjv/image/upload";

const PLACEHOLDER = {
  garden: `${CDN}/v1789538074/rajdhani/banners/ei2ixthqxnnzaqb2cfge.png`,
  processing: `${CDN}/v1789972667/rajdhani/news/pqrucjq6j4xsr02tn6zt.png`,
  testing: `${CDN}/v1789973116/rajdhani/news/m2l3nyhsesiggbiblhms.png`,
  packing: `${CDN}/v1789973360/rajdhani/news/oiclm4yuazh2gxgwhaly.png`,
  delivery: `${CDN}/v1789971444/rajdhani/products/bp2f3ybw4xbem6wr75dh.png`,
};

/**
 * The assurance band's photograph — the client's own, supplied for this band.
 *
 * Unlike the rest of these it is not a stand-in of the wrong subject. It lives
 * in `static/` rather than `public/` because `public/` is reference material
 * that never ships (see `public/README.md` and `vite.config.js`'s `publicDir`),
 * the same arrangement as About's `/about-us-our-company-left.png`.
 *
 * **2048x768 — an 8:3 panorama**, which matters for how it is drawn: the band's
 * image cell is roughly 2:1 on a phone and taller than it is wide at `lg`, so
 * `object-cover` crops the sides rather than the subject. The microscope and
 * the hands sit left of centre, so the crop keeps them.
 *
 * Served from the site rather than Cloudinary, so `CloudinaryImage` will not
 * build a `srcSet` for it — acceptable for a placeholder, and it goes away when
 * an editor uploads the real asset through the admin panel.
 */
const ASSURANCE_PHOTO = "/quality-assurance-lab.png";

/** `PublicBanner` — `placement=QUALITY_HERO`. */
export const QUALITY_HERO_BANNER = {
  id: "fixture-quality-hero",
  eyebrow_text: "Quality",
  title: "Quality in Every Sip",
  title_highlight: null,
  subtitle:
    "At Rajdhani Food Products, quality is not just a promise, it is our way of life.",
  desktop_image: { url: PLACEHOLDER.garden, alt: "" },
  overlay_opacity: 55,
};

/**
 * The hero's second paragraph, under the comp's small gold ornament.
 *
 * Not a banner column — `PublicBanner` has one `subtitle` — so it is passed to
 * `PageHero` separately. When an editor wants to change it, it becomes a
 * `page-blocks/quality` block rather than a new column on every banner.
 */
export const QUALITY_HERO_LEAD =
  "We follow international standards and strict quality control processes to ensure every cup of Rajdhani tea is pure, safe, and full of freshness.";

/** `PublicPageBlock[]` — the keys `page-blocks/quality` does not serve yet. */
export const QUALITY_BLOCKS = {
  commitment: {
    block_key: "commitment",
    eyebrow: null,
    heading: "Our Commitment to Quality",
    subheading: null,
    body:
      "<p>From the lush green tea gardens to the final packaging, we maintain the highest standards at every step. Our mission is to deliver premium quality tea that brings health, happiness, and trust to millions of tea lovers.</p>",
    bullet_points: [],
    cta_label: null,
    cta_url: null,
    image: null,
  },

  process: {
    block_key: "process",
    eyebrow: null,
    heading: "Our Quality Process",
    subheading:
      "Every step is carefully monitored to ensure the highest quality in every cup.",
    body: null,
    bullet_points: [],
    cta_label: null,
    cta_url: null,
    image: null,
  },

  certifications: {
    block_key: "certifications",
    eyebrow: null,
    heading: "Certifications & Standards",
    subheading:
      "We comply with international standards to ensure the best quality and safety.",
    body: null,
    bullet_points: [],
    cta_label: null,
    cta_url: null,
    image: null,
  },

  assurance: {
    block_key: "assurance",
    eyebrow: null,
    heading: "Quality Assurance is Our Promise",
    subheading: null,
    // The comp sets the closing clause in bold. That is copy formatting an
    // editor applies in the rich-text field, not something the panel hardcodes
    // — so it lives here, in the body, exactly as it would arrive from the API.
    body:
      "<p>We believe that great tea comes from great care. Our dedicated quality assurance team works round the clock to maintain consistency, safety <strong>and excellence in every product we deliver.</strong></p>",
    bullet_points: [
      "Regular Quality Checks",
      "Laboratory Testing",
      "Expert Quality Team",
      "Continuous Improvement",
    ],
    cta_label: null,
    cta_url: null,
    image: {
      url: ASSURANCE_PHOTO,
      alt: "A Rajdhani quality controller examining tea leaves under a microscope",
      width: 2048,
      height: 768,
    },
  },
};

/** `PublicFeatureItem[]` — `section=QUALITY_COMMITMENT`. */
export const QUALITY_COMMITMENT_ITEMS = [
  {
    id: "fixture-commitment-1",
    title: "Pure & Natural",
    description: "100% pure tea leaves with no added preservatives.",
    icon_name: "leaf",
    icon_bg_color: null,
    icon: null,
  },
  {
    id: "fixture-commitment-2",
    title: "Food Safety",
    description: "Strict food safety measures to ensure hygienic products.",
    icon_name: "shield-check",
    icon_bg_color: null,
    icon: null,
  },
  {
    id: "fixture-commitment-3",
    title: "Premium Quality",
    description: "Carefully selected leaves for rich aroma, taste and color.",
    icon_name: "award",
    icon_bg_color: null,
    icon: null,
  },
  {
    id: "fixture-commitment-4",
    title: "Advanced Technology",
    description: "Modern machinery and technology for consistent quality.",
    icon_name: "flask-conical",
    icon_bg_color: null,
    icon: null,
  },
  {
    id: "fixture-commitment-5",
    title: "Expert Supervision",
    description: "Experienced quality control team at every stage.",
    icon_name: "users",
    icon_bg_color: null,
    icon: null,
  },
  {
    id: "fixture-commitment-6",
    title: "Sustainable Practices",
    description: "Environment friendly practices for a better tomorrow.",
    icon_name: "globe",
    icon_bg_color: null,
    icon: null,
  },
];

/** `PublicProcessStep[]` — `group=QUALITY_PROCESS`, ordered by `step_number`. */
export const QUALITY_PROCESS_STEPS = [
  {
    id: "fixture-process-1",
    step_number: 1,
    title: "Careful Selection",
    description: "Finest tea leaves handpicked from the best gardens.",
    icon_name: "sprout",
    image: { url: PLACEHOLDER.garden, alt: "", width: 1200, height: 900 },
  },
  {
    id: "fixture-process-2",
    step_number: 2,
    title: "Hygienic Processing",
    description: "Leaves are cleaned and processed in a hygienic environment.",
    icon_name: "factory",
    image: { url: PLACEHOLDER.processing, alt: "", width: 1200, height: 900 },
  },
  {
    id: "fixture-process-3",
    step_number: 3,
    title: "Quality Testing",
    description: "Multiple quality tests to ensure purity, taste and freshness.",
    icon_name: "flask-conical",
    image: { url: PLACEHOLDER.testing, alt: "", width: 1200, height: 900 },
  },
  {
    id: "fixture-process-4",
    step_number: 4,
    title: "Safe Packaging",
    description: "Packed using high grade, food-safe packaging materials.",
    icon_name: "package",
    image: { url: PLACEHOLDER.packing, alt: "", width: 1200, height: 900 },
  },
  {
    id: "fixture-process-5",
    step_number: 5,
    title: "Safe Delivery",
    description: "Products are stored and delivered under proper conditions.",
    icon_name: "truck",
    image: { url: PLACEHOLDER.delivery, alt: "", width: 1200, height: 900 },
  },
];

/**
 * `PublicCertification[]`.
 *
 * The live endpoint already serves five of these with real uploaded logos, so
 * this list is only ever read on a machine that cannot reach the API. The comp
 * draws six; the sixth is the one the client has not sent a mark for.
 */
export const QUALITY_CERTIFICATIONS = [
  { id: "fixture-cert-1", name: "ISO 22000:2018", subtitle: "Food Safety Management", logo: null, certificate_url: null },
  { id: "fixture-cert-2", name: "HACCP", subtitle: "Hazard Analysis Critical Control Point", logo: null, certificate_url: null },
  { id: "fixture-cert-3", name: "BSTI", subtitle: "Certified", logo: null, certificate_url: null },
  { id: "fixture-cert-4", name: "Halal", subtitle: "Certified", logo: null, certificate_url: null },
  { id: "fixture-cert-5", name: "Environment", subtitle: "Friendly", logo: null, certificate_url: null },
  { id: "fixture-cert-6", name: "Food Safety", subtitle: "Assured", logo: null, certificate_url: null },
];

/**
 * `PublicPageBlock` — `page-blocks/gallery`, and `PublicStatCounter[]` —
 * `stats?group=GALLERY`.
 *
 * The gallery's closing strip. Both resources are live and both return `[]`:
 * the page key is accepted (the endpoint answers 200 with an empty list, not a
 * 404) and the admin has offered the `GALLERY` stat group all along. Nobody has
 * written the rows yet, so these stand in until someone does.
 */
export const GALLERY_HIGHLIGHT_BLOCK = {
  block_key: "closing",
  eyebrow: null,
  heading: "Capturing Quality, Delivering Trust",
  subheading: null,
  body:
    "<p>From garden to cup – every moment reflects our commitment to quality, care and excellence.</p>",
  bullet_points: [],
  cta_label: null,
  cta_url: null,
  image: null,
};

export const GALLERY_STATS = [
  { id: "fixture-gallery-stat-1", value: "12+", label: "Tea Gardens", icon_name: "leaf" },
  { id: "fixture-gallery-stat-2", value: "4+", label: "Manufacturing Units", icon_name: "factory" },
  { id: "fixture-gallery-stat-3", value: "200+", label: "Team Members", icon_name: "users" },
  { id: "fixture-gallery-stat-4", value: "64+", label: "Districts Covered", icon_name: "globe" },
];

/*
 * ── Dealer / Distributor ──────────────────────────────────────────────────
 *
 * Live today: the `DEALER_HERO` banner, the `intro` block, and four
 * `DEALER_BENEFITS` items. Empty: the `network`, `requirements` and
 * `build_future` blocks, the `BECOME_DEALER` steps and the `DEALER_NETWORK`
 * counters — so five of the page's six sections had nothing to draw.
 *
 * The comp's own copy, so the page can be designed against it. Real rows win
 * per resource the moment they exist.
 */

/** The hero chips — `intro.bullet_points`, which the live block leaves empty. */
export const DEALER_HERO_CHIPS = [
  "Premium Quality Products",
  "Trusted Brand in Bangladesh",
  "Attractive Margins",
  "Strong Support Network",
];

export const DEALER_BLOCKS = {
  intro: {
    block_key: "intro",
    eyebrow: null,
    heading: "Why Partner With Us?",
    subheading: null,
    body:
      "<p>We are committed to building long-term relationships with our dealers and distributors by providing the best quality products, reliable supply, and complete support to grow your business.</p>",
    bullet_points: DEALER_HERO_CHIPS,
    cta_label: null,
    cta_url: null,
    image: null,
  },

  network: {
    block_key: "network",
    eyebrow: null,
    heading: "Our Distribution Network",
    subheading:
      "We are expanding across Bangladesh and looking for passionate partners to grow together.",
    body: null,
    bullet_points: [],
    cta_label: null,
    cta_url: null,
    /*
      The client's own map, supplied for this band — a real Bangladesh
      silhouette with the designer's pins and the wordmark, not something
      drawn here. In `static/` for the same reason as the quality lab photo:
      `public/` is reference material that never ships.

      1906x825 and **opaque** — 24-bit, no alpha — so its white background is
      a real rectangle rather than nothing. `DistributionNetwork` blends it
      rather than the asset being edited; see the note there.

      Still a stand-in: this is the `network` block's image field, so an
      editor's upload replaces it without any code change.
    */
    image: { url: "/dealer-network-map.png", alt: "", width: 1906, height: 825 },
  },

  requirements: {
    block_key: "requirements",
    eyebrow: null,
    heading: "Dealer / Distributor Requirements",
    subheading: null,
    body: null,
    bullet_points: [
      "Valid Trade License",
      "TIN Certificate (For Companies)",
      "Business Experience (Preferred)",
      "Suitable Storage & Delivery Capability",
      "Commitment to Our Brand Values",
    ],
    cta_label: null,
    cta_url: null,
    image: null,
  },

  build_future: {
    block_key: "build_future",
    eyebrow: null,
    heading: "Let’s Build a Strong Future",
    subheading: null,
    body:
      "<p>Together we can bring the finest tea to every home and create lasting success.</p>",
    bullet_points: [],
    cta_label: null,
    cta_url: null,
    image: {
      url: `${CDN}/v1789971727/rajdhani/products/k0crweijy0gzmbtebntj.png`,
      alt: "",
      width: 1200,
      height: 900,
    },
  },
};

/** `PublicProcessStep[]` — `group=BECOME_DEALER`, ordered by `step_number`. */
export const DEALER_PROCESS_STEPS = [
  {
    id: "fixture-dealer-step-1",
    step_number: 1,
    title: "Submit Application",
    description: "Fill out the dealer/distributor application form online or offline.",
    icon_name: "file-text",
    image: null,
  },
  {
    id: "fixture-dealer-step-2",
    step_number: 2,
    title: "Verification",
    description: "Our team will verify your information and business background.",
    icon_name: "check-circle",
    image: null,
  },
  {
    id: "fixture-dealer-step-3",
    step_number: 3,
    title: "Approval",
    description: "Once approved, you will receive dealer/distributor confirmation.",
    icon_name: "handshake",
    image: null,
  },
  {
    id: "fixture-dealer-step-4",
    step_number: 4,
    title: "Place Your Order",
    description: "Start your initial order and get our premium products.",
    icon_name: "package",
    image: null,
  },
  {
    id: "fixture-dealer-step-5",
    step_number: 5,
    title: "Grow Your Business",
    description: "Enjoy continuous support and grow your business with us.",
    icon_name: "sparkles",
    image: null,
  },
];

/** `PublicStatCounter[]` — `group=DEALER_NETWORK`. */
export const DEALER_NETWORK_STATS = [
  { id: "fixture-dealer-stat-1", value: "64+", label: "Districts Covered", icon_name: "globe" },
  { id: "fixture-dealer-stat-2", value: "500+", label: "Active Partners", icon_name: "handshake" },
  { id: "fixture-dealer-stat-3", value: "12+", label: "Regional Offices", icon_name: "factory" },
  { id: "fixture-dealer-stat-4", value: "1000+", label: "Retail Outlets", icon_name: "users" },
];

/** `PublicFeatureItem[]` — `section=DEALER_BENEFITS`, live but only four rows. */
export const DEALER_BENEFIT_ITEMS = [
  { id: "fixture-dealer-benefit-1", title: "High Quality Products", description: "Premium quality tea blends crafted to perfection.", icon_name: "award", icon_bg_color: null, icon: null },
  { id: "fixture-dealer-benefit-2", title: "Attractive Profit Margins", description: "Competitive pricing with excellent profit potential.", icon_name: "tags", icon_bg_color: null, icon: null },
  { id: "fixture-dealer-benefit-3", title: "Marketing Support", description: "Promotional materials, branding & campaigns to boost your sales.", icon_name: "shield-check", icon_bg_color: null, icon: null },
  { id: "fixture-dealer-benefit-4", title: "Timely Delivery", description: "Reliable supply chain ensuring on-time delivery every time.", icon_name: "truck", icon_bg_color: null, icon: null },
  { id: "fixture-dealer-benefit-5", title: "Dedicated Support", description: "A dedicated team always ready to support you.", icon_name: "users", icon_bg_color: null, icon: null },
];
