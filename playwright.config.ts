import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.browser.test.ts',
  workers: 1,
  projects: [
    {
      use: devices['Desktop Chrome'],
    },
  ],
})
