/**
 * Seed every part of the About page the comp draws but the database is
 * missing, in one run.
 *
 * ## Why this is a script and not a code change
 *
 * Every section of the About comp is already built and already in the page, in
 * the comp's order: hero, Our Company, Our Foundations, the green counter
 * band, Our Strength, Certifications. Three of them render nothing because
 * each is gated on rows that do not exist —
 *
 *   - `StatsBand` returns null for an empty list; `stats?group=ABOUT` has none
 *   - `PageBlockSection` returns null without its block; there is no `strength`
 *   - `ProcessTimeline` needs steps; `MANUFACTURING_PROCESS` has none
 *
 * That gating is deliberate: an empty heading over an empty column is worse
 * than a section that is simply absent, and none of the copy may live in the
 * bundle (RTPP-43 — every word an editor can change). So the fix is rows, not
 * components.
 *
 * ## Running it
 *
 * From `frontend/customer`, in any shell:
 *
 *   node scripts/seed-about-page.mjs
 *
 * It asks for the admin email and password, with the password not echoed.
 * `ADMIN_EMAIL` and `ADMIN_PASSWORD` are read from the environment when they
 * are set, which is what a CI run would use; `API_BASE` overrides the target,
 * which defaults to production.
 *
 * Everything is an upsert — blocks matched on `block_key`, counters on
 * `label`, steps on `step_number` — so re-running repairs rather than
 * duplicates. Photographs are never touched: `image_id` is left out of every
 * write, so anything attached in the admin survives.
 *
 * Pass `--dry` to see what it would do without writing anything.
 */

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const API = (process.env.API_BASE ?? "https://rajdhanifood.com/api/v1").replace(/\/$/, "");
const DRY = process.argv.includes("--dry");

/**
 * Ask for whatever the environment did not supply.
 *
 * The environment-variable form is bash syntax: `VAR=x node …` is a parse
 * error in PowerShell, which is the shell this project is developed in. So
 * the variables are optional and anything missing is prompted for instead,
 * and the script works the same in either shell.
 *
 * The password is read with echo off, so it is not left on screen or in the
 * shell's history. It is never printed, and never written anywhere.
 */
async function credentials() {
  let email = process.env.ADMIN_EMAIL;
  let password = process.env.ADMIN_PASSWORD;
  if (email && password) return { email, password };

  if (!stdin.isTTY) {
    console.error(
      "No terminal to prompt on. Set ADMIN_EMAIL and ADMIN_PASSWORD, or run this directly in a terminal.",
    );
    process.exit(1);
  }

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    email ??= (await rl.question("Admin email: ")).trim();

    if (!password) {
      // `readline` has no hidden-input mode, so the echo is suppressed by
      // muting the output stream for the duration of the answer.
      const ask = rl.question("Admin password: ");
      const muted = (chunk, encoding, callback) => callback();
      const write = stdout.write.bind(stdout);
      stdout.write = muted;
      try {
        password = (await ask).trim();
      } finally {
        stdout.write = write;
        stdout.write("\n");
      }
    }
  } finally {
    rl.close();
  }

  return { email, password };
}

const { email: EMAIL, password: PASSWORD } = await credentials();

if (!EMAIL || !PASSWORD) {
  console.error("An email and a password are both needed.");
  process.exit(1);
}

const PAGE_KEY = "about";
const STAT_GROUP = "ABOUT";
const STEP_GROUP = "MANUFACTURING_PROCESS";

/** Page blocks, keyed by `block_key`. */
const BLOCKS = {
  values: {
    heading: "Our Values",
    // No body on purpose: the gold rule under a card heading is drawn only
    // when there is one, and the comp's Values card has no rule.
    bullet_points: [
      "Quality First",
      "Integrity & Transparency",
      "Customer Satisfaction",
      "Teamwork",
      "Sustainability",
      "Respect & Responsibility",
    ],
    status: "PUBLISHED",
  },
  strength: {
    eyebrow: "OUR STRENGTH",
    heading: "Modern Manufacturing & Quality Assurance",
    body: "<p>We use advanced technology and follow international standards at every stage of production to ensure purity, safety and consistent quality.</p>",
    cta_label: "Our Manufacturing Process",
    cta_url: "/quality",
    status: "PUBLISHED",
  },
};

/** The green band, left to right. Icon names must exist in `icon-registry.js`. */
const STATS = [
  { value: "25+", label: "Years of Experience", icon_name: "sprout", sort_order: 1 },
  { value: "500+", label: "Distributors", icon_name: "users", sort_order: 2 },
  { value: "1000+", label: "Products Delivered Daily", icon_name: "coffee", sort_order: 3 },
  { value: "1000+", label: "Happy Customers", icon_name: "smile", sort_order: 4 },
];

/** The five manufacturing steps. Photographs are added in the admin afterwards. */
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

/** POST or PATCH, reporting which. */
async function upsert(label, existing, collection, fields, createExtra = {}) {
  if (DRY) {
    console.log(`${existing ? "would update" : "would create"}  ${label}`);
    return;
  }

  const response = existing
    ? await fetch(`${API}/admin/${collection}/${existing.id}`, {
        method: "PATCH",
        headers: auth,
        body: JSON.stringify(fields),
      })
    : await fetch(`${API}/admin/${collection}`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ ...fields, ...createExtra }),
      });

  const result = await body(response);
  if (!response.ok) fail(`${existing ? "Updating" : "Creating"} ${label}`, response, result);
  console.log(`${existing ? "updated" : "created"}  ${label}`);
}

// ── Page blocks ──────────────────────────────────────────────────────────

const listedBlocks = await fetch(`${API}/admin/page-blocks?page_key=${PAGE_KEY}`, { headers: auth });
const blockRows = await body(listedBlocks);
if (!listedBlocks.ok) fail("Listing blocks", listedBlocks, blockRows);
const blocksByKey = new Map((Array.isArray(blockRows.data) ? blockRows.data : []).map((b) => [b.block_key, b]));

for (const [key, fields] of Object.entries(BLOCKS)) {
  await upsert(`block ${key}`, blocksByKey.get(key), "page-blocks", fields, {
    page_key: PAGE_KEY,
    block_key: key,
  });
}

// ── Counters ─────────────────────────────────────────────────────────────

const listedStats = await fetch(`${API}/admin/stat-counters?group=${STAT_GROUP}`, { headers: auth });
const statRows = await body(listedStats);
if (!listedStats.ok) fail("Listing counters", listedStats, statRows);
const statsByLabel = new Map((Array.isArray(statRows.data) ? statRows.data : []).map((s) => [s.label, s]));

for (const stat of STATS) {
  await upsert(`counter ${stat.value} ${stat.label}`, statsByLabel.get(stat.label), "stat-counters", { ...stat, is_active: true }, { group: STAT_GROUP });
}

// ── Steps ────────────────────────────────────────────────────────────────

const listedSteps = await fetch(`${API}/admin/process-steps?group=${STEP_GROUP}`, { headers: auth });
const stepRows = await body(listedSteps);
if (!listedSteps.ok) fail("Listing steps", listedSteps, stepRows);
const stepsByNumber = new Map((Array.isArray(stepRows.data) ? stepRows.data : []).map((s) => [s.step_number, s]));

for (const step of STEPS) {
  await upsert(`step 0${step.step_number} ${step.title}`, stepsByNumber.get(step.step_number), "process-steps", { ...step, sort_order: step.step_number, is_active: true }, { group: STEP_GROUP });
}

if (DRY) {
  console.log("\nDry run — nothing was written.");
  process.exit(0);
}

// ── Purge, or the page keeps serving the empty sections ─────────────────

const purge = await fetch(`${API}/admin/cache/purge`, { method: "POST", headers: auth, body: "{}" });
console.log(purge.ok ? "Cache purged." : `Cache purge returned ${purge.status} — it may expire on its own.`);

// ── Read back through the public routes the site actually uses ──────────

console.log("\nWhat the site will now see:");

const blocksAfter = await body(await fetch(`${API}/public/page-blocks/${PAGE_KEY}`));
const keys = (Array.isArray(blocksAfter.data) ? blocksAfter.data : []).map((b) => b.block_key);
console.log("  blocks   :", keys.join(", ") || "(none)");

const statsAfter = await body(await fetch(`${API}/public/stats?group=${STAT_GROUP}`));
console.log("  counters :", (Array.isArray(statsAfter.data) ? statsAfter.data : []).length);

const stepsAfter = await body(await fetch(`${API}/public/process-steps?group=${STEP_GROUP}`));
const steps = Array.isArray(stepsAfter.data) ? stepsAfter.data : [];
console.log("  steps    :", steps.length, steps.some((s) => s.image?.url) ? "(some with photos)" : "(icons until photos are added)");
