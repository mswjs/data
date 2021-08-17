/**
 * @see https://github.com/mswjs/data/issues/112
 */
import * as path from 'path'
import { CreateBrowserApi, createBrowser, pageWith } from 'page-with'

let browser: CreateBrowserApi

beforeAll(async () => {
  browser = await createBrowser({
    serverOptions: {
      webpackConfig: {
        resolve: {
          alias: {
            '@mswjs/data': path.resolve(__dirname, '../../..'),
          },
        },
      },
    },
  })
})

afterAll(async () => {
  await browser.cleanup()
})

it('creates numerous models in a browser without any memory leaks', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, '112-event-emitter-leak.runtime.js'),
  })

  expect(runtime.consoleSpy.get('warning')).toBeUndefined()
})
