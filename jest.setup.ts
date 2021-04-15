import * as path from 'path'
import { CreateBrowserApi, createBrowser } from 'page-with'

let browser: CreateBrowserApi

beforeAll(async () => {
  browser = await createBrowser({
    serverOptions: {
      webpackConfig: {
        resolve: {
          alias: {
            '@mswjs/data': path.resolve(__dirname, '.'),
          },
        },
      },
    },
  })
})

afterAll(async () => {
  await browser.cleanup()
})
