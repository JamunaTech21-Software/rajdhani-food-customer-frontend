/**
 * The width sweep, as an instrument rather than an eyeball (plan.md §1, R8).
 *
 * Four of the eight gates cannot be checked from source: whether anything
 * *actually* overflows, whether a target is *actually* 44px once its font has
 * loaded, whether text reflows at 400% zoom. Those need a rendered page, and
 * this turns each of them from a slow scan into one line in a console.
 *
 * ── How to run ───────────────────────────────────────────────────────────
 *
 *   1. Open the page, DevTools, Console.
 *   2. Paste this whole file and press Enter.
 *   3. Resize to each width in the matrix and run `audit()` again.
 *
 * It reads the page and writes nothing, so it is safe on production.
 *
 * ── What it cannot tell you ──────────────────────────────────────────────
 *
 * Whether the result *looks* right. A layout can pass all four checks and
 * still be ugly at 768. Run it to find the defects, then look at the page for
 * the design.
 *
 * Not part of the test suite: `npm test` matches `*.test.mjs`, and this needs
 * a browser. It lives here because Tailwind is told not to scan `tests/`, so
 * nothing in it can accidentally compile itself into the stylesheet.
 */

globalThis.audit = function audit({ targetMin = 44, measureMax = 75 } = {}) {
  const width = document.documentElement.clientWidth;
  const height = document.documentElement.clientHeight;
  const label = (el) =>
    `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${
      el.className && typeof el.className === "string"
        ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}`
        : ""
    }`;

  // ── G1: does the page scroll sideways, and what is doing it? ───────────
  const scrolls = document.documentElement.scrollWidth > width + 1;

  /** An ancestor that scrolls horizontally makes a wide child legitimate. */
  const inScroller = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const overflow = getComputedStyle(p).overflowX;
      if (overflow === "auto" || overflow === "scroll" || overflow === "hidden") return true;
    }
    return false;
  };

  const overflowing = [...document.body.querySelectorAll("*")]
    .filter((el) => {
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return false;
      // A couple of pixels of slack: sub-pixel layout rounds against us.
      return (box.right > width + 2 || box.left < -2) && !inScroller(el);
    })
    .map((el) => ({
      element: label(el),
      left: Math.round(el.getBoundingClientRect().left),
      right: Math.round(el.getBoundingClientRect().right),
      over: Math.round(el.getBoundingClientRect().right - width),
      node: el,
    }));

  // ── G3: targets you can actually hit ──────────────────────────────────
  const TARGETS = 'a[href], button, input, select, textarea, [role="button"], [role="tab"]';

  const small = [...document.querySelectorAll(TARGETS)]
    .filter((el) => {
      if (el.tabIndex < 0 || el.disabled) return false;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return false; // off-screen or hidden
      return box.width < targetMin || box.height < targetMin;
    })
    .map((el) => {
      const box = el.getBoundingClientRect();
      return {
        target: label(el),
        name: (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 40),
        w: Math.round(box.width),
        h: Math.round(box.height),
        node: el,
      };
    });

  // ── G7: how long a line of body text runs ─────────────────────────────
  const PROSE = "p, li, dd, blockquote";
  const long = [...document.querySelectorAll(PROSE)]
    .filter((el) => (el.textContent ?? "").trim().length > 120)
    .map((el) => {
      const style = getComputedStyle(el);
      // 0.5em is the usual rough stand-in for average character width.
      const ch = el.getBoundingClientRect().width / (parseFloat(style.fontSize) * 0.5);
      return { text: el.textContent.trim().slice(0, 40), ch: Math.round(ch), node: el };
    })
    .filter((row) => row.ch > measureMax);

  // ── G6: an image with no box reserved before it loads ─────────────────
  const unreserved = [...document.images]
    .filter((img) => {
      const style = getComputedStyle(img);
      const parent = img.parentElement && getComputedStyle(img.parentElement);
      const reserved =
        (img.getAttribute("width") && img.getAttribute("height")) ||
        style.aspectRatio !== "auto" ||
        (parent && parent.aspectRatio !== "auto") ||
        (parent && parent.height !== "auto" && parseFloat(parent.height) > 0);
      return !reserved;
    })
    .map((img) => ({ src: img.currentSrc.slice(-48), node: img }));

  const results = [
    ["page scrolls sideways", scrolls ? "YES — see the table below" : "no"],
    [`elements past ${width}px`, overflowing.length],
    [`targets under ${targetMin}px`, small.length],
    [`lines over ${measureMax}ch`, long.length],
    ["images with no reserved box", unreserved.length],
  ];

  console.group(`%cviewport audit — ${width}×${height}`, "font-weight:bold");
  console.table(Object.fromEntries(results));
  if (overflowing.length) console.table(overflowing);
  if (small.length) console.table(small);
  if (long.length) console.table(long);
  if (unreserved.length) console.table(unreserved);
  console.groupEnd();

  return { width, height, scrolls, overflowing, small, long, unreserved };
};

console.info("audit() is ready — resize, then run audit() at each width in plan.md §6.");
