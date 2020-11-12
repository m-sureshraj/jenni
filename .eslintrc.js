const OFF = 0;
const ERROR = 2;

module.exports = {
  parserOptions: {
    ecmaVersion: 2018,
  },
  env: {
    node: true,
    es6: true,
  },
  extends: ['eslint:recommended', 'plugin:jest/recommended', 'plugin:jest/style'],
  plugins: ['prettier', 'jest'],
  rules: {
    'prettier/prettier': ERROR,
    'no-console': OFF,
    'prefer-template': ERROR,
    curly: [ERROR, 'multi-line'],
  },
};
