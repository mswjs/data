import * as path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    root: __dirname,
    globals: true,
    testTimeout: 60_000,
    setupFiles: ['./vitest.setup.ts'],
    alias: {
      '@mswjs/data': path.resolve(__dirname, '../src'),
    },
    environmentOptions: {
      jsdom: {
        url: 'http://localhost',
      },
    },
  },
})
