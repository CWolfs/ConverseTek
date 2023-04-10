// {
//   "extends": ["airbnb"],
//   "rules": {
//     "linebreak-style": 0,
//     "react/self-closing-comp": 0,
//     "react/jsx-filename-extension": 0,
//     "react/forbid-prop-types": 0,
//     "jsx-a11y/anchor-is-valid": [
//       "error",
//       {
//         "components": ["Link"],
//         "specialLink": ["to"]
//       }
//     ],
//     "max-len": ["error", { "code": 140 }],
//     "arrow-parens": ["error", "always"],
//     "object-curly-newline": 0,
//     "function-paren-newline": ["error", "multiline"]
//   },
//   "parser": "babel-eslint",
//   "globals": {
//     "window": true,
//     "__BUILD_DATE__": true,
//     "boundControllerAsync": true
//   }
// }

module.exports = {
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:@typescript-eslint/recommended-requiring-type-checking'],
  parser: '@typescript-eslint/parser',
  ignorePatterns: ['**/*.js'],
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint'],
  root: true,
};
