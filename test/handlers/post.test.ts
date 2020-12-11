import { context, MockedResponse, response as mswResponseFN } from 'msw'
import { name, random } from 'faker'
import { factory, primaryKey } from '../../src'

test('should generate an handler to create an user', async () => {
  const db = factory({
    user: {
      id: primaryKey(random.uuid),
      firstName: name.firstName,
    },
  })

  const handlers = db.user.toHandlers()

  expect(db.user.count()).toBe(0)

  const response = (await handlers[2].resolver(
    {
      body: {
        firstName: 'Jack',
      },
    },
    mswResponseFN,
    context,
  )) as MockedResponse<any>

  expect(handlers[2].getMetaInfo()).toHaveProperty(
    'header',
    '[rest] POST /users',
  )
  expect(db.user.count()).toBe(1)
  expect(response.status).toBe(201)
  expect(JSON.parse(response.body)).toMatchObject({
    firstName: 'Jack',
  })
  expect(JSON.parse(response.body)).toEqual(db.user.getAll()[0])
})

test('should return an error when trying to create an user with the same key of another one', async () => {
  const db = factory({
    user: {
      id: primaryKey(random.uuid),
      firstName: name.firstName,
    },
  })

  const newUser = db.user.create()

  const handlers = db.user.toHandlers()

  const response = (await handlers[2].resolver(
    {
      body: {
        id: newUser.id,
        firstName: 'Jack',
      },
    },
    mswResponseFN,
    context,
  )) as MockedResponse<any>

  expect(response.status).toBe(409)
  expect(JSON.parse(response.body)).toEqual({
    message: `Failed to create "user": entity with the primary key "${newUser.id}" ("id") already exists.`,
  })
})
