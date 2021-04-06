import { CreateBrowserApi, createBrowser, pageWith } from 'page-with'
import { FactoryAPI } from '../../src/glossary'

declare namespace window {
  export const db: FactoryAPI<{ user: any }>
}

let context: CreateBrowserApi

beforeAll(async () => {
  context = await createBrowser({
    serverOptions: {
      webpackConfig: {
        module: {
          rules: [
            {
              test: /\.ts$/i,
              use: ['ts-loader'],
            },
          ],
        },
        resolve: {
          extensions: ['.js', '.ts'],
        },
      },
    },
  })
})

afterAll(async () => {
  await context.cleanup()
})

test.only('synchronizes entity creation between tabs', async () => {
  const { context, page, origin, debug } = await pageWith({
    example: 'test/middleware/usage.ts',
  })
  await debug()

  const secondPage = await context.newPage()
  await secondPage.goto(origin)

  await page.evaluate(() => {
    return window.db.user.create({
      id: 'abc-123',
      firstName: 'John',
      lastName: 'Maverick',
    })
  })

  function getAllUsers(activePage: typeof page) {
    return activePage.evaluate(() => {
      return window.db.user.getAll()
    })
  }

  const expectedUsers = [
    {
      __type: 'user',
      __primaryKey: 'id',
      id: 'abc-123',
      firstName: 'John',
      lastName: 'Maverick',
    },
  ]

  const firstPageUsers = await getAllUsers(page)
  expect(firstPageUsers).toHaveLength(1)
  expect(firstPageUsers).toEqual(expectedUsers)

  const secondPageUsers = await getAllUsers(secondPage)
  expect(secondPageUsers).toHaveLength(1)
  expect(secondPageUsers).toEqual(expectedUsers)
}, 1000000)
