module.exports = {
  root: true,
  globals: {
    window: true,
    __BUILD_DATE__: true,
    boundControllerAsync: true,
  },
  overrides: [
    {
      files: ['**/*.js'],
      extends: ['airbnb'],
      parser: 'babel-eslint',
      rules: {
        'linebreak-style': 0,
        'react/self-closing-comp': 0,
        'react/jsx-filename-extension': 0,
        'react/forbid-prop-types': 0,
        'jsx-a11y/anchor-is-valid': [
          'error',
          {
            components: ['Link'],
            specialLink: ['to'],
          },
        ],
        'max-len': ['error', { code: 150 }],
        'arrow-parens': ['error', 'always'],
        'object-curly-newline': 0,
        'function-paren-newline': ['error', 'multiline'],
        'import/no-unresolved': [0, { commonjs: true, amd: true }],
        'import/named': 0,
        'import/no-named-as-default': 0,
        'import/no-named-as-default-member': 0,
        'import/namespace': 0,
        'import/default': 0,
        'import/export': 0,
        'import/prefer-default-export': 0,
        'react/jsx-props-no-spreading': 0,
        'react/function-component-definition': 0,
      },
    },
    {
      files: ['**/*.ts', '**/*.tsx'],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
      ],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
      plugins: ['@typescript-eslint'],
    },
  ],
};
