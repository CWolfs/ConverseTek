// Soft file-length limit: warns above 700 lines. The hard 800 limit is the core 'max-lines' rule.
// Mirrors the C# analysers CTK0001 / CTK0002. Loaded with `eslint --rulesdir eslint-rules`.
const WARNING_LINES = 700;

module.exports = {
  meta: {
    type: 'suggestion',
    docs: { description: `Warn when a file is longer than ${WARNING_LINES} lines` },
    schema: [],
    messages: {
      tooLong: 'File has {{lines}} lines (soft limit {{limit}}); consider splitting it.',
    },
  },
  create(context) {
    return {
      Program(node) {
        const lines = context.getSourceCode().lines.length;
        if (lines <= WARNING_LINES) return;
        context.report({ node, loc: { line: 1, column: 0 }, messageId: 'tooLong', data: { lines, limit: WARNING_LINES } });
      },
    };
  },
};
