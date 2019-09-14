module.exports = {
  parserOptions: {
    ecmaVersion: 2018,
  },
  env: {
    node: true,
    es6: true,
  },
  extends: 'eslint:recommended',
  plugins: ['prettier'],
  // 0: off, 1: warn, 2: error
  rules: {
    'prettier/prettier': 'error',
    'no-console': 'off',
  },
};
