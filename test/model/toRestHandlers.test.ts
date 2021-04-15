import fetch from 'node-fetch'
import { name, datatype } from 'faker'
import { setupServer } from 'msw/node'
import { factory, drop, primaryKey } from '@mswjs/data'

const db = factory({
  user: {
    id: primaryKey(datatype.uuid),
    firstName: name.firstName,
    lastName: name.lastName,
  },
})

const server = setupServer()

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  drop(db)
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

it('generates CRUD request handlers for the model', () => {
  const userHandlers = db.user.toHandlers('rest')
  const displayRoutes = userHandlers.map((handler) => handler.info.header)

  expect(displayRoutes).toEqual([
    'GET /users',
    'GET /users/:id',
    'POST /users',
    'PUT /users/:id',
    'DELETE /users/:id',
  ])
})

describe('GET /users', () => {
  it('handles a GET request to get all entities', async () => {
    server.use(...db.user.toHandlers('rest', 'http://localhost'))
    db.user.create({
      id: 'abc-123',
      firstName: 'John',
      lastName: 'White',
    })
    db.user.create({
      id: 'def-456',
      firstName: 'Kate',
      lastName: 'Moen',
    })

    const res = await fetch('http://localhost/users')
    const users = await res.json()

    expect(res.status).toEqual(200)
    expect(users).toEqual([
      {
        id: 'abc-123',
        firstName: 'John',
        lastName: 'White',
      },
      {
        id: 'def-456',
        firstName: 'Kate',
        lastName: 'Moen',
      },
    ])
  })

  it('returns offset paginated entities', async () => {
    server.use(...db.user.toHandlers('rest', 'http://localhost'))
    db.user.create({
      id: 'abc-123',
      firstName: 'John',
      lastName: 'White',
    })
    db.user.create({
      id: 'def-456',
      firstName: 'Kate',
      lastName: 'Moen',
    })
    db.user.create({
      id: 'ghi-789',
      firstName: 'Joseph',
      lastName: 'Sipes',
    })
    db.user.create({
      id: 'xyz-321',
      firstName: 'Eva',
      lastName: 'Grant',
    })

    const res = await fetch('http://localhost/users?skip=1&take=2')
    const users = await res.json()

    expect(users).toEqual([
      {
        id: 'def-456',
        firstName: 'Kate',
        lastName: 'Moen',
      },
      {
        id: 'ghi-789',
        firstName: 'Joseph',
        lastName: 'Sipes',
      },
    ])
  })

  it('returns cursor paginated entities', async () => {
    server.use(...db.user.toHandlers('rest', 'http://localhost'))
    db.user.create({
      id: 'abc-123',
      firstName: 'John',
      lastName: 'White',
    })
    db.user.create({
      id: 'def-456',
      firstName: 'Kate',
      lastName: 'Moen',
    })
    db.user.create({
      id: 'ghi-789',
      firstName: 'Joseph',
      lastName: 'Sipes',
    })
    db.user.create({
      id: 'xyz-321',
      firstName: 'Eva',
      lastName: 'Grant',
    })

    const res = await fetch('http://localhost/users?cursor=def-456&take=2')
    const users = await res.json()

    expect(users).toEqual([
      {
        id: 'ghi-789',
        firstName: 'Joseph',
        lastName: 'Sipes',
      },
      {
        id: 'xyz-321',
        firstName: 'Eva',
        lastName: 'Grant',
      },
    ])
  })

  it('return filtered entities', async () => {
    server.use(...db.user.toHandlers('rest', 'http://localhost'))
    db.user.create({
      id: 'abc-123',
      firstName: 'John',
      lastName: 'White',
    })
    db.user.create({
      id: 'def-456',
      firstName: 'Kate',
      lastName: 'Moen',
    })
    db.user.create({
      id: 'def-789',
      firstName: 'Kate',
      lastName: 'Hilll',
    })
    const res = await fetch(
      'http://localhost/users?firstName=Kate&lastName=Moen',
    )
    const users = await res.json()

    expect(users).toEqual([
      {
        id: 'def-456',
        firstName: 'Kate',
        lastName: 'Moen',
      },
    ])
  })

  it('return all entities when wrong filter param is provided', async () => {
    server.use(...db.user.toHandlers('rest', 'http://localhost'))
    db.user.create({
      id: 'abc-123',
      firstName: 'John',
      lastName: 'White',
    })
    db.user.create({
      id: 'def-456',
      firstName: 'Kate',
      lastName: 'Moen',
    })
    const res = await fetch('http://localhost/users?surname=Kate')
    const users = await res.json()

    expect(users).toEqual([
      {
        id: 'abc-123',
        firstName: 'John',
        lastName: 'White',
      },
      {
        id: 'def-456',
        firstName: 'Kate',
        lastName: 'Moen',
      },
    ])
  })
})

describe('GET /users/:id', () => {
  it('handles a GET request to get a single entity', async () => {
    server.use(...db.user.toHandlers('rest', 'http://localhost'))
    db.user.create({
      id: 'abc-123',
      firstName: 'John',
      lastName: 'White',
    })
    db.user.create({
      id: 'def-456',
      firstName: 'Kate',
      lastName: 'Moen',
    })

    const res = await fetch('http://localhost/users/def-456')
    const user = await res.json()

    expect(res.status).toEqual(200)
    expect(user).toEqual({
      id: 'def-456',
      firstName: 'Kate',
      lastName: 'Moen',
    })
  })

  it('returns a 404 response when getting a non-existing entity', async () => {
    server.use(...db.user.toHandlers('rest', 'http://localhost'))
    db.user.create({
      id: 'abc-123',
      firstName: 'John',
      lastName: 'White',
    })

    const res = await fetch('http://localhost/users/xyz-321')
    const json = await res.json()

    expect(res.status).toEqual(404)
    expect(json).toEqual({
      message:
        'Failed to execute "findFirst" on the "user" model: no entity found matching the query "{"id":{"equals":"xyz-321"}}".',
    })
  })
})

describe('POST /users', () => {
  it('handles a POST request to create a new entity', async () => {
    server.use(...db.user.toHandlers('rest', 'http://localhost'))

    const res = await fetch('http://localhost/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 'abc-123',
        firstName: 'Joseph',
        lastName: 'Sipes',
      }),
    })
    const user = await res.json()

    expect(res.status).toEqual(201)
    expect(user).toEqual({
      id: 'abc-123',
      firstName: 'Joseph',
      lastName: 'Sipes',
    })
  })

  it('returns a 409 response when creating a user with the same id', async () => {
    server.use(...db.user.toHandlers('rest', 'http://localhost'))
    db.user.create({
      id: 'abc-123',
    })

    const res = await fetch('http://localhost/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 'abc-123',
        firstName: 'Joseph',
      }),
    })
    const json = await res.json()

    expect(res.status).toEqual(409)
    expect(json).toEqual({
      message:
        'Failed to create a "user" entity: an entity with the same primary key "abc-123" ("id") already exists.',
    })
  })
})

describe('PUT /users/:id', () => {
  it('handles a PUT request to update an entity', async () => {
    server.use(...db.user.toHandlers('rest', 'http://localhost'))
    db.user.create({
      id: 'abc-123',
      firstName: 'John',
      lastName: 'White',
    })

    const res = await fetch('http://localhost/users/abc-123', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: 'Joseph',
      }),
    })
    const user = await res.json()

    expect(res.status).toEqual(200)
    expect(user).toEqual({
      id: 'abc-123',
      firstName: 'Joseph',
      lastName: 'White',
    })
  })

  it('returns a 404 response when updating a non-existing entity', async () => {
    server.use(...db.user.toHandlers('rest', 'http://localhost'))

    const res = await fetch('http://localhost/users/abc-123', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: 'Joseph',
      }),
    })
    const json = await res.json()

    expect(res.status).toEqual(404)
    expect(json).toEqual({
      message:
        'Failed to execute "update" on the "user" model: no entity found matching the query "{"id":{"equals":"abc-123"}}".',
    })
  })

  it('returns a 409 response when updating an entity with primary key of another entity', async () => {
    server.use(...db.user.toHandlers('rest', 'http://localhost'))
    db.user.create({
      id: 'abc-123',
      firstName: 'John',
      lastName: 'White',
    })
    db.user.create({
      id: 'def-456',
      firstName: 'Kate',
      lastName: 'Moen',
    })

    const res = await fetch('http://localhost/users/abc-123', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 'def-456',
        firstName: 'Joseph',
        lastName: 'Sipes',
      }),
    })
    const json = await res.json()

    expect(res.status).toEqual(409)
    expect(json).toEqual({
      message:
        'Failed to execute "update" on the "user" model: the entity with a primary key "def-456" ("id") already exists.',
    })
  })
})

describe('DELETE /users/:id', () => {
  it('handles a DELETE request to delete an entity', async () => {
    server.use(...db.user.toHandlers('rest', 'http://localhost'))
    db.user.create({
      id: 'abc-123',
      firstName: 'John',
      lastName: 'White',
    })
    db.user.create({
      id: 'def-456',
      firstName: 'Kate',
      lastName: 'Moen',
    })

    const res = await fetch('http://localhost/users/def-456', {
      method: 'DELETE',
    })
    const user = await res.json()
    expect(res.status).toEqual(200)
    expect(user).toEqual({
      id: 'def-456',
      firstName: 'Kate',
      lastName: 'Moen',
    })

    const allUsers = await fetch('http://localhost/users').then((res) =>
      res.json(),
    )
    expect(allUsers).toEqual([
      {
        id: 'abc-123',
        firstName: 'John',
        lastName: 'White',
      },
    ])
  })

  it('returns a 404 response when deleting a non-existing entity', async () => {
    server.use(...db.user.toHandlers('rest', 'http://localhost'))

    const res = await fetch('http://localhost/users/def-456', {
      method: 'DELETE',
    })
    const json = await res.json()

    expect(res.status).toEqual(404)
    expect(json).toEqual({
      message:
        'Failed to execute "delete" on the "user" model: no entity found matching the query "{"id":{"equals":"def-456"}}".',
    })
  })
})
