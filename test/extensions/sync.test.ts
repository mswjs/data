import * as path from 'path'
import { createBrowser, CreateBrowserApi, pageWith } from 'page-with'
import { FactoryAPI } from '../../src/glossary'

interface User {
  id: string
  firstName: string
}

declare namespace window {
  export const db: FactoryAPI<{ user: User }>
  export const secondDb: FactoryAPI<{ user: User }>
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

  expect(await secondPage.evaluate(() => window.db.user.getAll())).toEqual([
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
  expect(await secondPage.evaluate(() => window.db.user.getAll())).toEqual(
    expectedUsers,
  )
  expect(await runtime.page.evaluate(() => window.db.user.getAll())).toEqual(
    expectedUsers,
  )
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

  expect(await secondPage.evaluate(() => window.db.user.getAll())).toEqual([])
  expect(await runtime.page.evaluate(() => window.db.user.getAll())).toEqual([])
})

test('handles events from multiple database instances separately', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'sync.multiple.runtime.js'),
  })
  const secondPage = await runtime.context.newPage()
  await secondPage.goto(runtime.origin)
  await runtime.page.bringToFront()

  const john = {
    __type: 'user',
    __primaryKey: 'id',
    id: 'abc-123',
    firstName: 'John',
  }

  const kate = {
    __type: 'user',
    __primaryKey: 'id',
    id: 'def-456',
    firstName: 'Kate',
  }

  // Create a new user in the first database.
  await runtime.page.evaluate(() => {
    window.db.user.create({ id: 'abc-123', firstName: 'John' })
  })
  expect(await runtime.page.evaluate(() => window.db.user.getAll())).toEqual([
    john,
  ])
  expect(await secondPage.evaluate(() => window.db.user.getAll())).toEqual([
    john,
  ])

  // No entities are created in the second, unrelated database.
  expect(
    await secondPage.evaluate(() => {
      return window.secondDb.user.getAll()
    }),
  ).toEqual([])

  await secondPage.evaluate(() => {
    window.secondDb.user.create({ id: 'def-456', firstName: 'Kate' })
  })

  // A new entity created in a different database is synchronized in another client.
  expect(
    await runtime.page.evaluate(() => window.secondDb.user.getAll()),
  ).toEqual([kate])

  // An unrelated database does not contain a newly created entity.
  expect(await runtime.page.evaluate(() => window.db.user.getAll())).toEqual([
    john,
  ])
})

test('handles events from multiple databases on different hostnames', async () => {
  const firstRuntime = await pageWith({
    example: path.resolve(__dirname, 'sync.runtime.js'),
  })
  const secondRuntime = await pageWith({
    example: path.resolve(__dirname, 'sync.multiple.runtime.js'),
  })
  expect(firstRuntime.origin).not.toEqual(secondRuntime.origin)

  await firstRuntime.page.evaluate(() => {
    window.db.user.create({ id: 'abc-123', firstName: 'John' })
  })
  expect(
    await secondRuntime.page.evaluate(() => window.db.user.getAll()),
  ).toEqual([])

  await secondRuntime.page.evaluate(() => {
    window.db.user.create({ id: 'def-456', firstName: 'Kate' })
  })
  expect(
    await firstRuntime.page.evaluate(() => window.db.user.getAll()),
  ).toEqual([
    {
      __type: 'user',
      __primaryKey: 'id',
      id: 'abc-123',
      firstName: 'John',
    },
  ])
})
