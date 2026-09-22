/**
 * Fill in the About page's "Our Values" list.
 *
 * ## Why this exists
 *
 * The admin's list editor could not accept a second line. It held the list as
 * `string[]` and re-derived the textarea's text from it on every keystroke, so
 * pressing Enter produced an empty line, `filter(Boolean)` dropped it, and the
 * controlled value rewrote the box without the newline. Whatever went in
 * first was all the list could ever hold — which is why the live `values`
 * block came back with exactly one bullet.
 *
 * That is fixed in `BlockEditorDialog.jsx`, but the fix only reaches the
 * deployed admin when the admin is rebuilt. This script writes the same rows
 * through the same API in the meantime, so the page can be correct now.
 *
 * ## Running it
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='...' \
 *   API_BASE=https://rajdhanifood.com/api/v1 \
 *   node scripts/add-values-block.mjs
 *
 * The credentials come from the environment and are never printed, so nothing
 * secret ends up in a terminal log. It is an upsert: it creates the block if
 * it is missing and patches it if it is already there, so re-running is safe
 * and it repairs the truncated one-bullet row rather than duplicating it.
 */

const API = (process.env.API_BASE ?? "https://rajdhanifood.com/api/v1").replace(/\/$/, "");
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in the environment.");
  process.exit(1);
}

/** The six the comp ticks off, in the order it lists them. */
const BULLETS = [
  "Quality First",
  "Integrity & Transparency",
  "Customer Satisfaction",
  "Teamwork",
  "Sustainability",
  "Respect & Responsibility",
];

const PAGE_KEY = "about";
const BLOCK_KEY = "values";

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

// ── Find the row, if it is already there ─────────────────────────────────
//
// The admin list is what carries the id; the public endpoint does not return
// one, and a PATCH needs it.

const listed = await fetch(`${API}/admin/page-blocks?page_key=${PAGE_KEY}`, { headers: auth });
const rows = await body(listed);
if (!listed.ok) fail("Listing blocks", listed, rows);

const existing = (Array.isArray(rows.data) ? rows.data : []).find((b) => b.block_key === BLOCK_KEY);

// ── Write ────────────────────────────────────────────────────────────────

const fields = {
  heading: "Our Values",
  // No body on purpose: `FoundationCard` draws the gold rule under the
  // heading only when there is one, and the comp's Values card has no rule.
  bullet_points: BULLETS,
  status: "PUBLISHED",
};

const written = existing
  ? await fetch(`${API}/admin/page-blocks/${existing.id}`, {
      method: "PATCH",
      headers: auth,
      body: JSON.stringify(fields),
    })
  : await fetch(`${API}/admin/page-blocks`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ ...fields, page_key: PAGE_KEY, block_key: BLOCK_KEY }),
    });

const result = await body(written);
if (!written.ok) fail(existing ? "Update" : "Create", written, result);
console.log(
  existing
    ? `Updated the existing values block (had ${existing.bullet_points?.length ?? 0} item(s)).`
    : "Created the values block.",
);

// ── Purge, or the page keeps serving the old list ────────────────────────

const purge = await fetch(`${API}/admin/cache/purge`, { method: "POST", headers: auth, body: "{}" });
console.log(purge.ok ? "Cache purged." : `Cache purge returned ${purge.status} — it may expire on its own.`);

// ── Read it back through the public route the site actually uses ─────────

const after = await body(await fetch(`${API}/public/page-blocks/${PAGE_KEY}`));
const values = (Array.isArray(after.data) ? after.data : []).find((b) => b.block_key === BLOCK_KEY);
console.log(`Public route now returns ${values?.bullet_points?.length ?? 0} value(s):`);
for (const point of values?.bullet_points ?? []) console.log("  -", point);
