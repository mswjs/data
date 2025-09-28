import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.browser.test.ts',
  workers: 1,
  use: {
    launchOptions: {
      devtools: true,
    },
  },
  projects: [
    {
      use: devices['Desktop Chrome'],
    },
  ],
})
