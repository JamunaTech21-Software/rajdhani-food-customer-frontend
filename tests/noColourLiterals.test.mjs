import assert from "node:assert/strict";
import { test } from "node:test";

import { RuleTester } from "eslint";

import { noColourLiterals } from "../eslint-rules/no-colour-literals.js";

/**
 * The rule that keeps §18.2 true, tested.
 *
 * RTPP-56 asks for the no-colour-literals guarantee "enforced by a lint rule,
 * not by review". A rule nobody tests is one that can stop matching after a
 * refactor and pass everything in silence — which looks exactly like a codebase
 * with no violations.
 */
const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2023,
    sourceType: "module",
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

test("the rule catches every way a colour gets hardcoded", () => {
  ruleTester.run("no-colour-literals", noColourLiterals, {
    valid: [
      // Project tokens — the whole point is that these are allowed.
      { code: 'const a = <div className="bg-brand text-on-brand" />;' },
      { code: 'const a = <div className="border-line bg-ground text-ink-muted" />;' },
      { code: 'const a = <div className="bg-brand-tint text-danger" />;' },
      // Not colours at all.
      { code: 'const id = "#root";' },
      { code: 'const n = "grid-cols-3 gap-4 p-6";' },
      { code: 'const heading = "Our Premium Tea Range";' },
      // A palette-shaped name that is not a Tailwind colour utility.
      { code: 'const a = "duration-300";' },
    ],

    invalid: [
      {
        code: 'const s = { color: "#1B5E20" };',
        errors: [{ messageId: "literal" }],
      },
      {
        // Shorthand hex.
        code: 'const s = { color: "#fff" };',
        errors: [{ messageId: "literal" }],
      },
      {
        code: 'const s = { boxShadow: "0 0 4px rgba(0,0,0,0.4)" };',
        errors: [{ messageId: "literal" }],
      },
      {
        code: 'const s = { background: "oklch(0.7 0.1 140)" };',
        errors: [{ messageId: "literal" }],
      },
      {
        // Tailwind's own palette is a hardcoded colour wearing a class name —
        // bg-green-700 does not move when primary_color changes.
        code: 'const a = <div className="bg-green-700" />;',
        errors: [{ messageId: "literal" }],
      },
      {
        code: 'const a = <div className="text-slate-500 border-red-300" />;',
        errors: [{ messageId: "literal" }],
      },
      {
        // Hiding it in a template literal must not help.
        code: "const a = `bg-${x} text-emerald-600`;",
        errors: [{ messageId: "literal" }],
      },
    ],
  });
});

test("the message names the offender and points at the fix", () => {
  // An error saying only "no colour literals" sends someone hunting.
  const { literal } = noColourLiterals.meta.messages;

  assert.match(literal, /\{\{ found \}\}/, "names what it found");
  assert.match(literal, /tokens\.css/, "says where the tokens live");
  assert.match(literal, /primary_color/, "says why it matters");
});
