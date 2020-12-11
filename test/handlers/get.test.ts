import { context, MockedResponse, response as mswResponseFN } from 'msw'
import { name, random } from 'faker'
import { factory, primaryKey } from '../../src'
import { repeat } from '../testUtils'

test('should generate an handler to get all users', async () => {
  const db = factory({
    user: {
      id: primaryKey(random.uuid),
      firstName: name.firstName,
    },
  })

  const createdUser = db.user.create({
    firstName: 'John',
    id: '1234',
  })

  const handlers = db.user.toHandlers()

  const response = (await handlers[0].resolver(
    { url: { searchParams: new URLSearchParams() } },
    mswResponseFN,
    context,
  )) as MockedResponse<any>

  expect(handlers[0].getMetaInfo()).toHaveProperty(
    'header',
    '[rest] GET /users',
  )
  expect(response.status).toBe(200)
  expect(JSON.parse(response.body)).toEqual([createdUser])
})

test('should generate an handler to get an user using his primary key', async () => {
  const db = factory({
    user: {
      id: primaryKey(random.uuid),
      firstName: name.firstName,
    },
  })

  const createdUser = db.user.create({
    firstName: 'John',
    id: '1234',
  })

  const handlers = db.user.toHandlers()

  const response = (await handlers[1].resolver(
    {
      params: {
        id: '1234',
      },
    },
    mswResponseFN,
    context,
  )) as MockedResponse<any>

  expect(handlers[1].getMetaInfo()).toHaveProperty(
    'header',
    '[rest] GET /users/:id',
  )
  expect(response.status).toBe(200)
  expect(JSON.parse(response.body)).toEqual(createdUser)
})

test("should return an error if the request user dosn't exist", async () => {
  const db = factory({
    user: {
      id: primaryKey(random.uuid),
      firstName: name.firstName,
    },
  })

  db.user.create({
    firstName: 'John',
    id: '1234',
  })

  const handlers = db.user.toHandlers()

  const response = (await handlers[1].resolver(
    {
      params: {
        id: '5678',
      },
    },
    mswResponseFN,
    context,
  )) as MockedResponse<any>

  expect(response.status).toBe(404)
  expect(JSON.parse(response.body)).toEqual({
    message: `Failed to execute "findFirst" on the "user" model: no entity found matching the query "{\"id\":{\"equals\":\"5678\"}}".`,
  })
})

test('should return items based on take and skip parameters', async () => {
  const db = factory({
    user: {
      id: primaryKey(random.uuid),
      firstName: name.firstName,
    },
  })

  const users = []
  repeat(() => users.push(db.user.create()), 10)

  const handlers = db.user.toHandlers()

  let response = (await handlers[0].resolver(
    {
      url: {
        searchParams: new URLSearchParams({
          take: '3',
        }),
      },
    },
    mswResponseFN,
    context,
  )) as MockedResponse<any>

  let paginatedUsers = JSON.parse(response.body)

  expect(response.status).toBe(200)
  expect(paginatedUsers).toHaveLength(3)
  expect(paginatedUsers).toEqual(users.slice(0, 3))

  response = (await handlers[0].resolver(
    {
      url: {
        searchParams: new URLSearchParams({
          skip: '3',
          take: '3',
        }),
      },
    },
    mswResponseFN,
    context,
  )) as MockedResponse<any>

  paginatedUsers = JSON.parse(response.body)

  expect(response.status).toBe(200)
  expect(paginatedUsers).toHaveLength(3)
  expect(paginatedUsers).toEqual(users.slice(3, 6))
})

test('should return paginated users starting from cursor', async () => {
  const db = factory({
    user: {
      id: primaryKey(random.uuid),
      firstName: name.firstName,
    },
  })

  const users = []
  repeat(() => users.push(db.user.create()), 20)

  const handlers = db.user.toHandlers()

  const response = (await handlers[0].resolver(
    {
      url: {
        searchParams: new URLSearchParams({
          cursor: users[5].id,
          take: '5',
        }),
      },
    },
    mswResponseFN,
    context,
  )) as MockedResponse<any>

  const paginatedUsers = JSON.parse(response.body)

  expect(response.status).toBe(200)
  expect(paginatedUsers).toHaveLength(5)
  expect(paginatedUsers).toEqual(users.slice(6, 11))
})
