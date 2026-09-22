/**
 * Fill in the About page's green counter band.
 *
 * `AboutPage` already renders it — `<StatsBand … tone="dark" />` — and
 * `StatsBand` already draws exactly what the comp draws on that band: the dark
 * green field, ringed outline icons, white figures and hairline dividers
 * between the four. It renders nothing because `StatsBand` returns `null` for
 * an empty list, and `GET /public/stats?group=ABOUT` comes back with none.
 *
 * So the band is missing four rows, not any code. This creates them through
 * the same endpoint the admin's Sections screen uses.
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='...' \
 *   API_BASE=https://rajdhanifood.com/api/v1 \
 *   node scripts/add-about-stats.mjs
 *
 * Credentials come from the environment and are never printed. Re-running is
 * safe: a row whose label already exists in the group is updated rather than
 * added again, so this will not leave you with eight counters.
 */

const API = (process.env.API_BASE ?? "https://rajdhanifood.com/api/v1").replace(/\/$/, "");
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in the environment.");
  process.exit(1);
}

const GROUP = "ABOUT";

/**
 * The four the comp draws, left to right.
 *
 * `icon_name` has to be a key in the customer app's `icon-registry.js` —
 * anything else renders as a blank ring. These four are all in it.
 */
const STATS = [
  { value: "25+", label: "Years of Experience", icon_name: "sprout", sort_order: 1 },
  { value: "500+", label: "Distributors", icon_name: "users", sort_order: 2 },
  { value: "1000+", label: "Products Delivered Daily", icon_name: "coffee", sort_order: 3 },
  { value: "1000+", label: "Happy Customers", icon_name: "smile", sort_order: 4 },
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

// ── What is already there ────────────────────────────────────────────────

const listed = await fetch(`${API}/admin/stat-counters?group=${GROUP}`, { headers: auth });
const rows = await body(listed);
if (!listed.ok) fail("Listing counters", listed, rows);

const existing = Array.isArray(rows.data) ? rows.data : [];
const byLabel = new Map(existing.map((row) => [row.label, row]));

// ── Write ────────────────────────────────────────────────────────────────

for (const stat of STATS) {
  const already = byLabel.get(stat.label);

  const response = already
    ? await fetch(`${API}/admin/stat-counters/${already.id}`, {
        method: "PATCH",
        headers: auth,
        body: JSON.stringify({ ...stat, is_active: true }),
      })
    : await fetch(`${API}/admin/stat-counters`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ ...stat, group: GROUP, is_active: true }),
      });

  const result = await body(response);
  if (!response.ok) fail(`${already ? "Updating" : "Creating"} "${stat.label}"`, response, result);
  console.log(`${already ? "updated" : "created"}  ${stat.value.padEnd(7)} ${stat.label}`);
}

// ── Purge, or the page keeps serving the empty list ─────────────────────

const purge = await fetch(`${API}/admin/cache/purge`, { method: "POST", headers: auth, body: "{}" });
console.log(purge.ok ? "Cache purged." : `Cache purge returned ${purge.status} — it may expire on its own.`);

// ── Read back through the public route the site actually uses ───────────

const after = await body(await fetch(`${API}/public/stats?group=${GROUP}`));
const items = Array.isArray(after.data) ? after.data : [];
console.log(`Public route now returns ${items.length} counter(s):`);
for (const item of items) console.log(`  ${item.value.padEnd(7)} ${item.label}  [${item.icon_name}]`);
