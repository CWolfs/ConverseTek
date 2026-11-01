// Files already over the 800-line limit. Split these, then remove them from the list.
const GRANDFATHERED_LONG_FILES = [
  'src/components/AiDraftModal/AiDraftModal.tsx',
  'src/stores/nodeStore/node-store.ts',
  'src/utils/tree-data-utils.ts',
  'src/utils/ai-draft-utils.ts',
  'src/utils/__tests__/ai-draft-utils.test.ts',
];

module.exports = {
  root: true,
  globals: {
    window: true,
    __BUILD_DATE__: true,
    __INITIAL_ROUTE_PATH__: true,
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:react/jsx-runtime',
        'plugin:react-hooks/recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        // Last, so formatting is left to Prettier (npm run format:check)
        'prettier',
      ],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
      plugins: ['@typescript-eslint', 'react', 'react-hooks', 'jsx-a11y'],
      rules: {
        'jsx-a11y/anchor-is-valid': [
          'error',
          {
            components: ['Link'],
            specialLink: ['to'],
          },
        ],
        'react/prop-types': 0,
        'react/jsx-props-no-spreading': 0,
        'react/jsx-one-expression-per-line': 0,
        'react-hooks/exhaustive-deps': 0,
        '@typescript-eslint/no-empty-function': ['error', { allow: ['arrowFunctions'] }],

        // House rules shared with the C# side (.editorconfig)
        curly: ['error', 'all'],
        complexity: ['error', 20],
        'max-lines': ['error', { max: 800, skipBlankLines: false, skipComments: false }],
        'file-length-warning': 'warn',
      },
    },
    {
      files: GRANDFATHERED_LONG_FILES,
      rules: {
        'max-lines': ['warn', { max: 800, skipBlankLines: false, skipComments: false }],
      },
    },
  ],
};
