import fs from 'node:fs'
import path from 'node:path'
import { invariant } from 'outvariant'
import { test as testBase, expect, type Page } from '@playwright/test'
import { createServer, type ViteDevServer } from 'vite'

interface Fixtures {
  serve: <Context extends Record<string, unknown>>(
    fn: () => Promise<Context>,
  ) => Promise<{
    url: URL
    evaluate: <Callback extends (context: Context) => any>(
      callback: Callback,
      options?: { page: Page },
    ) => Promise<ReturnType<Callback>>
  }>
}

export { expect }

export const test = testBase.extend<Fixtures>({
  async serve({ page }, use) {
    let server: ViteDevServer | undefined

    const directory = path.join(
      process.cwd(),
      './tests/.tmp',
      test.info().testId,
    )
    const entryPath = path.join(directory, 'entry.ts')

    await use(async (fn) => {
      await fs.promises.mkdir(directory, { recursive: true })
      await fs.promises.writeFile(
        entryPath,
        `window.__vite_playwright_context__ = await (${fn.toString()})();`,
        'utf8',
      )

      await fs.promises.writeFile(
        path.join(directory, 'index.html'),
        `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"/></head>
  <body>
    <script type="module" src="/entry.ts"></script>
  </body>
</html>
      `,
        'utf8',
      )

      server = await createServer({
        root: directory,
        optimizeDeps: {
          entries: [entryPath],
        },
        build: {
          target: 'chrome139',
          rollupOptions: {
            external: /.+/,
          },
        },
        configFile: false,
        logLevel: 'error',
      })

      await server.listen()
      await page.waitForLoadState('networkidle')

      const url = server.resolvedUrls?.local[0]
      invariant(url, 'Failed to spawn Vite dev server')

      return {
        url: new URL(url),
        async evaluate(callback, options) {
          const targetPage = options?.page || page
          const context = await targetPage.evaluateHandle(
            () => window['__vite_playwright_context__' as keyof typeof window],
          )
          return await context.evaluate(callback)
        },
      }
    })

    await Promise.all([
      server?.close(),
      fs.promises.rm(directory, { recursive: true }),
    ])
  },
})
