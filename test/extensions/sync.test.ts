import * as path from 'path'
import { createBrowser, CreateBrowserApi, pageWith } from 'page-with'
import { FactoryAPI } from '../../src/glossary'

declare namespace window {
  export const db: FactoryAPI<any>
}

let browser: CreateBrowserApi

beforeAll(async () => {
  browser = await createBrowser({
    serverOptions: {
      webpackConfig: {
        resolve: {
          alias: {
            '@mswjs/data': path.resolve(__dirname, '../..'),
          },
        },
      },
    },
  })
})

afterAll(async () => {
  await browser.cleanup()
})

test('synchornizes entity create across multiple clients', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'sync.runtime.js'),
  })
  const secondPage = await runtime.context.newPage()
  await secondPage.goto(runtime.origin)
  await runtime.page.bringToFront()

  await runtime.page.evaluate(() => {
    window.db.user.create({
      id: 'abc-123',
      firstName: 'John',
    })
  })

  const users = await secondPage.evaluate(() => {
    return window.db.user.getAll()
  })
  expect(users).toEqual([
    {
      __type: 'user',
      __primaryKey: 'id',
      id: 'abc-123',
      firstName: 'John',
    },
  ])
})

test('synchornizes entity update across multiple clients', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'sync.runtime.js'),
  })
  const secondPage = await runtime.context.newPage()
  await secondPage.goto(runtime.origin)
  await runtime.page.bringToFront()

  await runtime.page.evaluate(() => {
    window.db.user.create({
      id: 'abc-123',
      firstName: 'John',
    })
  })

  await secondPage.evaluate(() => {
    return window.db.user.update({
      which: {
        id: {
          equals: 'abc-123',
        },
      },
      data: {
        firstName: 'Kate',
      },
    })
  })

  const expectedUsers = [
    {
      __type: 'user',
      __primaryKey: 'id',
      id: 'abc-123',
      firstName: 'Kate',
    },
  ]
  const users = await secondPage.evaluate(() => {
    return window.db.user.getAll()
  })
  expect(users).toEqual(expectedUsers)

  const extraneousUsers = await runtime.page.evaluate(() => {
    return window.db.user.getAll()
  })
  expect(extraneousUsers).toEqual(expectedUsers)
})

test('synchronizes entity delete across multiple clients', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'sync.runtime.js'),
  })
  const secondPage = await runtime.context.newPage()
  await secondPage.goto(runtime.origin)
  await runtime.page.bringToFront()

  await runtime.page.evaluate(() => {
    window.db.user.create({
      id: 'abc-123',
      firstName: 'John',
    })
  })

  await secondPage.evaluate(() => {
    window.db.user.delete({
      which: {
        id: {
          equals: 'abc-123',
        },
      },
    })
  })

  const users = await secondPage.evaluate(() => {
    return window.db.user.getAll()
  })
  expect(users).toEqual([])

  const extraneousUsers = await runtime.page.evaluate(() => {
    return window.db.user.getAll()
  })
  expect(extraneousUsers).toEqual([])
})
