/**
 * Fill in the About page's "Our Strength" band.
 *
 * `AboutPage` already renders it, and `ProcessTimeline` already draws what the
 * comp draws: square tiles, a numbered badge straddling each tile's lower
 * edge, dotted arrows between them. Two things are missing from the database
 * and the section needs both before it appears at all:
 *
 *   - the `strength` page block — without it `PageBlockSection` returns null
 *     and the whole band, steps included, is absent
 *   - five `MANUFACTURING_PROCESS` steps
 *
 * **The photographs are not set here.** `image_id` has to reference a
 * `media_asset` that already exists, which means uploading through the admin's
 * media picker and its signed Cloudinary flow — not something to fake from a
 * script. Until then `ProcessTimeline` falls back to a named icon on the brand
 * tint, which is a deliberate mark rather than a broken picture, so the band
 * reads correctly while you add the photos in the admin afterwards.
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='...' \
 *   API_BASE=https://rajdhanifood.com/api/v1 \
 *   node scripts/add-about-strength.mjs
 *
 * Credentials come from the environment and are never printed. Re-running is
 * safe: the block is matched on `block_key` and the steps on `step_number`
 * within the group, so both are updated rather than duplicated. An image
 * already attached to a step is left alone — this never clears one.
 */

const API = (process.env.API_BASE ?? "https://rajdhanifood.com/api/v1").replace(/\/$/, "");
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in the environment.");
  process.exit(1);
}

const PAGE_KEY = "about";
const GROUP = "MANUFACTURING_PROCESS";

const BLOCK = {
  eyebrow: "OUR STRENGTH",
  heading: "Modern Manufacturing & Quality Assurance",
  body:
    "<p>We use advanced technology and follow international standards at every stage of production to ensure purity, safety and consistent quality.</p>",
  cta_label: "Our Manufacturing Process",
  // The page the button goes to in the comp's navigation. Change it in the
  // admin if it should point somewhere else.
  cta_url: "/quality",
  status: "PUBLISHED",
};

/** The five the comp draws, left to right. Icon names must exist in the customer app's icon-registry.js. */
const STEPS = [
  { step_number: 1, title: "Carefully Sourced", description: "Finest tea leaves are handpicked from the best gardens.", icon_name: "leaf" },
  { step_number: 2, title: "Hygienic Processing", description: "Advanced machinery ensures clean and efficient processing.", icon_name: "factory" },
  { step_number: 3, title: "Quality Testing", description: "Multiple quality checks ensure purity, taste and freshness.", icon_name: "flask-conical" },
  { step_number: 4, title: "Fresh Packaging", description: "Sealed packaging locks in aroma and maintains freshness.", icon_name: "package" },
  { step_number: 5, title: "Safe Delivery", description: "Products are delivered safely to your doorstep.", icon_name: "truck" },
];

const body = async (response) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 300) };
  }
};

const fail = (what, response, payload) => {
  console.error(`${what} failed:`, response.status, JSON.stringify(payload).slice(0, 400));
  process.exit(1);
};

// ── Sign in ──────────────────────────────────────────────────────────────

const login = await fetch(`${API}/auth/admin/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
const session = await body(login);
if (!login.ok) fail("Login", login, session);

const token = session?.data?.tokens?.access_token;
if (!token) {
  console.error("No access token in the login response.");
  process.exit(1);
}
const auth = { "content-type": "application/json", authorization: `Bearer ${token}` };

// ── The block ────────────────────────────────────────────────────────────

const listedBlocks = await fetch(`${API}/admin/page-blocks?page_key=${PAGE_KEY}`, { headers: auth });
const blockRows = await body(listedBlocks);
if (!listedBlocks.ok) fail("Listing blocks", listedBlocks, blockRows);

const existingBlock = (Array.isArray(blockRows.data) ? blockRows.data : []).find(
  (b) => b.block_key === "strength",
);

const blockResponse = existingBlock
  ? await fetch(`${API}/admin/page-blocks/${existingBlock.id}`, {
      method: "PATCH",
      headers: auth,
      body: JSON.stringify(BLOCK),
    })
  : await fetch(`${API}/admin/page-blocks`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ ...BLOCK, page_key: PAGE_KEY, block_key: "strength" }),
    });

const blockResult = await body(blockResponse);
if (!blockResponse.ok) fail(existingBlock ? "Updating the block" : "Creating the block", blockResponse, blockResult);
console.log(`${existingBlock ? "updated" : "created"}  strength block`);

// ── The five steps ───────────────────────────────────────────────────────

const listedSteps = await fetch(`${API}/admin/process-steps?group=${GROUP}`, { headers: auth });
const stepRows = await body(listedSteps);
if (!listedSteps.ok) fail("Listing steps", listedSteps, stepRows);

const byNumber = new Map(
  (Array.isArray(stepRows.data) ? stepRows.data : []).map((row) => [row.step_number, row]),
);

for (const step of STEPS) {
  const already = byNumber.get(step.step_number);
  const fields = { ...step, sort_order: step.step_number, is_active: true };

  const response = already
    ? await fetch(`${API}/admin/process-steps/${already.id}`, {
        method: "PATCH",
        headers: auth,
        // `image_id` is deliberately not in `fields`, so a photo added in the
        // admin survives a re-run of this script.
        body: JSON.stringify(fields),
      })
    : await fetch(`${API}/admin/process-steps`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ ...fields, group: GROUP }),
      });

  const result = await body(response);
  if (!response.ok) fail(`${already ? "Updating" : "Creating"} step ${step.step_number}`, response, result);
  console.log(`${already ? "updated" : "created"}  0${step.step_number} ${step.title}`);
}

// ── Purge, or the page keeps serving the empty section ──────────────────

const purge = await fetch(`${API}/admin/cache/purge`, { method: "POST", headers: auth, body: "{}" });
console.log(purge.ok ? "Cache purged." : `Cache purge returned ${purge.status} — it may expire on its own.`);

// ── Read back through the public routes the site actually uses ──────────

const blocksAfter = await body(await fetch(`${API}/public/page-blocks/${PAGE_KEY}`));
const strength = (Array.isArray(blocksAfter.data) ? blocksAfter.data : []).find(
  (b) => b.block_key === "strength",
);
console.log(`strength block published: ${strength ? "yes" : "no"}`);

const stepsAfter = await body(await fetch(`${API}/public/process-steps?group=${GROUP}`));
const steps = Array.isArray(stepsAfter.data) ? stepsAfter.data : [];
console.log(`Public route now returns ${steps.length} step(s):`);
for (const step of steps) {
  console.log(`  0${step.step_number} ${step.title}  ${step.image?.url ? "[photo]" : `[icon: ${step.icon_name}]`}`);
}
