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
      },
    },
  ],
};
