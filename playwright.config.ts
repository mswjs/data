import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.browser.test.ts',
  workers: 1,
  projects: [
    {
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          /**
           * @note Emulate Chrome's `unload` deprecation so the tests
           * fail if any code relies on the `unload` event.
           */
          args: ['--enable-features=DeprecateUnload'],
        },
      },
    },
  ],
})
