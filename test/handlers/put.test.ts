import { context, MockedResponse, response as mswResponseFN } from 'msw'
import { name, random } from 'faker'
import { factory, primaryKey } from '../../src'

test('should generate an handler to update an existing user', async () => {
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

  const response = (await handlers[4].resolver(
    {
      body: {
        firstName: 'Jack',
      },
      params: {
        id: '1234',
      },
    },
    mswResponseFN,
    context,
  )) as MockedResponse<any>

  expect(handlers[4].getMetaInfo()).toHaveProperty(
    'header',
    '[rest] PUT /users/:id',
  )
  expect(db.user.count()).toBe(1)
  expect(response.status).toBe(200)
  expect(JSON.parse(response.body)).toMatchObject({
    firstName: 'Jack',
  })
  expect(JSON.parse(response.body)).toEqual(db.user.getAll()[0])
})

test("should return an error when trying to update an user that doen't exist", async () => {
  const db = factory({
    user: {
      id: primaryKey(random.uuid),
      firstName: name.firstName,
    },
  })

  db.user.create({
    firstName: 'John',
    id: '5678',
  })

  const handlers = db.user.toHandlers()

  const response = (await handlers[4].resolver(
    {
      body: {
        firstName: 'Jack',
      },
      params: {
        id: '1234',
      },
    },
    mswResponseFN,
    context,
  )) as MockedResponse<any>

  expect(response.status).toBe(404)
  expect(JSON.parse(response.body)).toEqual({
    message: `Failed to execute "update" on the "user" model: no entity found matching the query "{"id":{"equals":"1234"}}".`,
  })
})

test('should return an error when trying to update an user using the key of another entity', async () => {
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

  db.user.create({
    firstName: 'John',
    id: '5678',
  })

  const handlers = db.user.toHandlers()

  const response = (await handlers[4].resolver(
    {
      body: {
        firstName: 'Jack',
        id: '5678',
      },
      params: {
        id: '1234',
      },
    },
    mswResponseFN,
    context,
  )) as MockedResponse<any>

  expect(response.status).toBe(409)
  expect(JSON.parse(response.body)).toEqual({
    message: `Failed to execute "update" on the "user" model: the entity with a primary key "5678" ("id") already exists.`,
  })
})
