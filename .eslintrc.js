module.exports = {
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
    ecmaFeatures: { jsx: true },
  },
  extends: ['eslint:recommended'],
  overrides: [
    { files: ['./*.js'], env: { node: true } },
    {
      files: ['./**/*.ts?(x)'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint/eslint-plugin'],
      extends: ['plugin:@typescript-eslint/recommended'],
      rules: {
        'no-unused-vars': 'off',
        'no-undef': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/ban-ts-comment': [
          'error',
          { 'ts-ignore': 'allow-with-description' },
        ],
      },
    },
    {
      files: ['./**/*.test.ts'],
      env: { node: true, jest: true, browser: true },
    },
  ],
}
