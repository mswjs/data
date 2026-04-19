import { defineConfig, defaultExclude } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    exclude: [...defaultExclude, '**/*.browser.test.ts'],
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.test.json',
    },
  },
})
