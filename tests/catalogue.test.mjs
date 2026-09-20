import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CATALOGUE_COLUMNS,
  catalogueFilename,
  catalogueRows,
  csvCell,
  fetchAllPages,
  toCsv,
} from "../src/lib/catalogue.js";

const BOM = String.fromCharCode(0xfeff);

// One live product, verbatim.
const PRODUCT = {
  id: "01M2D2DTMQZ5M2EPSHC3JZBGYH",
  name: "Classic Black Tea Testing",
  slug: "rajdhani-classic-black-tea",
  short_description: "A robust classic black blend for the strong-tea drinker.",
  tagline: "Bold. Dark. Traditional.",
  badge_text: "CLASSIC",
  badge_color: "#8B4513",
  rating_average: 0,
  rating_count: 0,
  price: 150,
  compare_price: null,
  discount_percent: null,
  image: { url: "https://res.cloudinary.com/c3mbbtjv/image/upload/black.jpg" },
  category: { name: "Classic Black", slug: "classic-black" },
};

// ── Escaping ─────────────────────────────────────────────────────────────

test("a comma in a description does not become a second column", () => {
  assert.equal(csvCell("Strong, dark and malty"), '"Strong, dark and malty"');
});

test("a quote is doubled, not dropped", () => {
  assert.equal(csvCell('The "morning" blend'), '"The ""morning"" blend"');
});

test("a newline inside a cell keeps the cell together", () => {
  assert.equal(csvCell("Line one\nLine two"), '"Line one\nLine two"');
  assert.equal(csvCell("Line one\r\nLine two"), '"Line one\r\nLine two"');
});

test("a plain value is not quoted for the sake of it", () => {
  assert.equal(csvCell("Green Tea"), "Green Tea");
  assert.equal(csvCell(150), "150");
});

test("nothing is ever written as the string null or undefined", () => {
  for (const empty of [null, undefined, ""]) assert.equal(csvCell(empty), "");
  assert.equal(csvCell(Number.NaN), "", "and NaN is blank, not the word NaN");
  assert.equal(csvCell(Number.POSITIVE_INFINITY), "");
});

// ── The one that is a security bug, not a formatting bug ─────────────────

test("a cell cannot become a formula when the file is opened", () => {
  // Excel and Sheets *evaluate* a cell starting with these. Product names come
  // from a CMS an editor types into, so this is reachable: a product called
  // `=HYPERLINK("http://…","Click")` would run on whoever opens the file.
  for (const attack of ["=1+1", "+1", "-1", "@SUM(A1)", "\tcmd", "\rcmd"]) {
    const cell = csvCell(attack);
    assert.ok(cell.startsWith("'") || cell.startsWith(`"'`), `${JSON.stringify(attack)} is not guarded`);
  }
});

test("the guard survives quoting, rather than being applied after it", () => {
  // `=cmd|'/c calc'!A1` contains no comma, but a name that needs both is the
  // case where an apostrophe added outside the quotes would do nothing.
  assert.equal(csvCell('=HYPERLINK("a","b")'), `"'=HYPERLINK(""a"",""b"")"`);
});

test("a negative number is a number, not an attack", () => {
  // Guarding it would put `'-50` in a price column, which a spreadsheet then
  // cannot add up. Numbers are ours; only strings come from an editor.
  assert.equal(csvCell(-50), "-50");
  assert.equal(csvCell("-50"), "'-50", "a numeric-looking *string* is still guarded");
});

// ── The document ─────────────────────────────────────────────────────────

test("the file opens in Excel with its accents intact", () => {
  // Without the byte-order mark Excel reads UTF-8 as the system code page, and
  // every Bangla character, curly apostrophe and ৳ sign arrives as mojibake.
  const csv = toCsv([{ key: "a", header: "A" }], [{ a: "সবুজ চা" }]);

  assert.ok(csv.startsWith(BOM));
  assert.ok(csv.includes("সবুজ চা"));
});

test("rows end in CRLF, as RFC 4180 says", () => {
  const csv = toCsv([{ key: "a", header: "A" }], [{ a: "one" }, { a: "two" }]);

  assert.equal(csv, `${BOM}A\r\none\r\ntwo\r\n`);
});

test("the header is the column list, in order", () => {
  const header = toCsv(CATALOGUE_COLUMNS, []).replace(BOM, "").trim();

  assert.equal(header.split(",")[0], "Product");
  assert.equal(header.split(",").length, CATALOGUE_COLUMNS.length);
});

test("a column with no value in a row is blank, not shifted", () => {
  const csv = toCsv(
    [
      { key: "a", header: "A" },
      { key: "b", header: "B" },
      { key: "c", header: "C" },
    ],
    [{ a: "1", c: "3" }],
  );

  assert.equal(csv.trim().split("\r\n")[1], "1,,3");
});

// ── The rows ─────────────────────────────────────────────────────────────

test("a product becomes the row the columns expect", () => {
  const [row] = catalogueRows([PRODUCT], { siteUrl: "https://rajdhanifood.com" });

  assert.equal(row.name, PRODUCT.name);
  assert.equal(row.category, "Classic Black");
  assert.equal(row.tagline, "Bold. Dark. Traditional.");
  assert.equal(row.price, 150);
  assert.equal(row.url, "https://rajdhanifood.com/products/rajdhani-classic-black-tea");
  assert.equal(row.image, PRODUCT.image.url);
});

test("every column key is produced by the row builder", () => {
  // A column added to one and not the other is a silently empty column.
  const [row] = catalogueRows([PRODUCT], { siteUrl: "https://x.test" });

  for (const column of CATALOGUE_COLUMNS) {
    assert.ok(column.key in row, `${column.key} is a column with no value`);
  }
});

test("an unrated product has a blank rating, not a zero", () => {
  // Every product in the catalogue is at zero today. A column of zeroes drags
  // down any average a reader takes of it — the same reason the Product
  // JSON-LD omits `aggregateRating` entirely.
  const [row] = catalogueRows([PRODUCT]);

  assert.equal(row.rating, "");
  assert.equal(row.reviews, 0, "but the count is honestly zero");
});

test("a rated product carries its average", () => {
  const [row] = catalogueRows([{ ...PRODUCT, rating_average: 4.4, rating_count: 30 }]);

  assert.equal(row.rating, 4.4);
  assert.equal(row.reviews, 30);
});

test("a null price is blank rather than zero", () => {
  // `Number(null)` is 0, which would put a free product in the catalogue.
  const [row] = catalogueRows([{ ...PRODUCT, price: null, compare_price: null }]);

  assert.equal(row.price, "");
  assert.equal(row.comparePrice, "");
});

test("a missing site origin leaves the link blank, not relative", () => {
  assert.equal(catalogueRows([PRODUCT], { siteUrl: "" })[0].url, "");
  assert.equal(
    catalogueRows([PRODUCT], { siteUrl: "https://x.test/" })[0].url,
    "https://x.test/products/rajdhani-classic-black-tea",
    "and a trailing slash does not double up",
  );
});

test("a malformed payload does not take the download down", () => {
  assert.deepEqual(catalogueRows(null), []);
  assert.deepEqual(catalogueRows(undefined), []);
  assert.equal(catalogueRows([null, {}])[0].name, "");
});

// ── The filename ─────────────────────────────────────────────────────────

test("the file is named for the brand and the day", () => {
  const name = catalogueFilename("Rajdhani Food Products", new Date(2026, 8, 20));

  assert.equal(name, "rajdhani-food-products-catalogue-2026-09-20.csv");
});

test("a missing or odd site name still gives a usable filename", () => {
  assert.match(catalogueFilename(null, new Date(2026, 0, 5)), /^catalogue-2026-01-05\.csv$/);
  assert.match(catalogueFilename("  ///  ", new Date(2026, 0, 5)), /^catalogue-2026-01-05\.csv$/);
});

// ── Paging ───────────────────────────────────────────────────────────────

test("every page is fetched, because the API caps limit at 100 silently", () => {
  // Ask for 500 and the response comes back with `limit: 100` and totalPages
  // computed against it. A single request would ship a truncated catalogue
  // the day the client publishes their 101st product, and nothing would look
  // wrong about the file.
  const pages = {
    1: { items: [{ n: 1 }], meta: { totalPages: 3 } },
    2: { items: [{ n: 2 }], meta: { totalPages: 3 } },
    3: { items: [{ n: 3 }], meta: { totalPages: 3 } },
  };

  return fetchAllPages(({ page }) => Promise.resolve(pages[page])).then((items) => {
    assert.deepEqual(items, [{ n: 1 }, { n: 2 }, { n: 3 }]);
  });
});

test("one page is one request", async () => {
  let calls = 0;
  const items = await fetchAllPages(() => {
    calls += 1;
    return Promise.resolve({ items: [{ n: 1 }], meta: { totalPages: 1 } });
  });

  assert.equal(calls, 1);
  assert.equal(items.length, 1);
});

test("a nonsense totalPages cannot spin forever against a live API", async () => {
  let calls = 0;
  await fetchAllPages(
    () => {
      calls += 1;
      return Promise.resolve({ items: [], meta: { totalPages: 9999 } });
    },
    { maxPages: 4 },
  );

  assert.equal(calls, 4);
});

test("a response with no meta is treated as the only page", async () => {
  const items = await fetchAllPages(() => Promise.resolve({ items: [{ n: 1 }] }));

  assert.deepEqual(items, [{ n: 1 }]);
});
