/**
 * Only `src/config.js` may read `import.meta.env`.
 *
 * RTPP-57's third requirement: "configuration flows through one module". The
 * reason is not tidiness. Vite replaces `import.meta.env.VITE_X` by matching the
 * **exact source text** at build time, so every extra reading site is another
 * place a rename has to be found — and a missed one does not fail the build, it
 * compiles to `undefined` and fails at runtime with nothing to trace it by.
 *
 * Funnelling every read through one module means a rename is one edit, and the
 * fallbacks live beside the names they belong to.
 */

const ALLOWED = /(^|[\\/])src[\\/]config\.js$/;

export const configOnlyEnv = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow reading import.meta.env outside src/config.js",
    },
    schema: [],
    messages: {
      direct:
        "Read configuration from `src/config.js`, not `import.meta.env` directly. Vite substitutes these by exact source text, so a second reading site is a second place a rename silently becomes `undefined`.",
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (ALLOWED.test(filename)) return {};

    return {
      MetaProperty(node) {
        // `import.meta` on its own is fine — `import.meta.url` is how a module
        // finds itself, and has nothing to do with configuration.
        if (node.meta?.name !== "import" || node.property?.name !== "meta") return;

        const parent = node.parent;
        if (parent?.type === "MemberExpression" && parent.property?.name === "env") {
          context.report({ node: parent, messageId: "direct" });
        }
      },
    };
  },
};

export default { rules: { "config-only-env": configOnlyEnv } };
