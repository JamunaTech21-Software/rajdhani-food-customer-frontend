/**
 * Forbid naming a colour outright. Use a token from `shared/theme/tokens.css`.
 *
 * RTPP-56 asks for this "enforced by a lint rule, not by review", and the
 * distinction matters: a review catches it when someone looks, a rule catches it
 * on the keystroke. It is what keeps §18.2 true — an admin changes
 * `primary_color` and the whole site follows. One hardcoded `#1B5E20` is a patch
 * of the old brand that survives the change, and nobody finds it until a client
 * asks why one button is the wrong green.
 *
 * Reports hex (`#1b5e20`), functional colours (`rgb()`, `hsl()`, `oklch()`) and
 * Tailwind's built-in palette classes (`bg-green-700`), which are hardcoded
 * colours wearing a class name.
 */

const HEX = /#[0-9a-fA-F]{3,8}\b/;
const FUNCTIONAL = /\b(?:rgba?|hsla?|oklch|oklab|color-mix)\(/;

// Tailwind's own palette. Project tokens (bg-brand, text-ink) do not match,
// because they are not one of these names.
const TAILWIND_PALETTE =
  /\b(?:bg|text|border|ring|fill|stroke|from|via|to|outline|decoration|shadow|accent|caret|divide|placeholder)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|\d{3})\b/;

const check = (value) => {
  if (typeof value !== "string") return null;
  if (HEX.test(value)) return value.match(HEX)[0];
  if (FUNCTIONAL.test(value)) return value.match(FUNCTIONAL)[0];
  if (TAILWIND_PALETTE.test(value)) return value.match(TAILWIND_PALETTE)[0];
  return null;
};

export const noColourLiterals = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow colour literals and Tailwind palette classes; use a theme token so runtime theming works",
    },
    schema: [],
    messages: {
      literal:
        "Hardcoded colour `{{ found }}`. Use a token from shared/theme/tokens.css (bg-brand, text-ink, border-line…) — a literal survives an admin changing primary_color and strands this element on the old brand.",
    },
  },

  create(context) {
    const report = (node, value) => {
      const found = check(value);
      if (found) context.report({ node, messageId: "literal", data: { found } });
    };

    return {
      Literal(node) {
        report(node, node.value);
      },
      TemplateElement(node) {
        report(node, node.value.raw);
      },
      JSXText(node) {
        // Prose naming a colour is fine; a class attribute is not. JSXText is
        // page copy, so only the functional/hex forms are worth flagging here.
        if (HEX.test(node.value) || FUNCTIONAL.test(node.value)) {
          report(node, node.value);
        }
      },
    };
  },
};

export default { rules: { "no-colour-literals": noColourLiterals } };
