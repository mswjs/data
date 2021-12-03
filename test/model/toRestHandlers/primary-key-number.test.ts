import fetch from 'node-fetch'
import { setupServer } from 'msw/node'
import { factory, drop, primaryKey } from '../../../src'

const db = factory({
  todo: {
    id: primaryKey(Number),
    title: String,
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
  const userHandlers = db.todo.toHandlers('rest')
  const displayRoutes = userHandlers.map((handler) => handler.info.header)

  expect(displayRoutes).toEqual([
    'GET /todos',
    'GET /todos/:id',
    'POST /todos',
    'PUT /todos/:id',
    'DELETE /todos/:id',
  ])
})

describe('GET /todos/:id', () => {
  it('handles a GET request to get a single entity', async () => {
    server.use(...db.todo.toHandlers('rest', 'http://localhost'))

    db.todo.create({
      id: 123,
      title: 'Todo 1',
    })
    db.todo.create({
      id: 456,
      title: 'Todo 2',
    })

    const res = await fetch('http://localhost/todos/123')
    const todo = await res.json()

    expect(res.status).toEqual(200)
    expect(todo).toEqual({
      id: 123,
      title: 'Todo 1',
    })
  })

  it('returns a 404 response when getting a non-existing entity', async () => {
    server.use(...db.todo.toHandlers('rest', 'http://localhost'))

    db.todo.create({
      id: 123,
      title: 'Todo 1',
    })

    const res = await fetch('http://localhost/todos/456')
    const json = await res.json()

    expect(res.status).toEqual(404)
    expect(json).toEqual({
      message:
        'Failed to execute "findFirst" on the "todo" model: no entity found matching the query "{"id":{"equals":456}}".',
    })
  })
})

describe('PUT /todos/:id', () => {
  it('handles a PUT request to update an entity', async () => {
    server.use(...db.todo.toHandlers('rest', 'http://localhost'))

    db.todo.create({
      id: 123,
      title: 'Todo 1',
    })

    const res = await fetch('http://localhost/todos/123', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Todo 1 updated',
      }),
    })
    const todo = await res.json()

    expect(res.status).toEqual(200)
    expect(todo).toEqual({
      id: 123,
      title: 'Todo 1 updated',
    })
  })

  it('returns a 404 response when updating a non-existing entity', async () => {
    server.use(...db.todo.toHandlers('rest', 'http://localhost'))

    const res = await fetch('http://localhost/todos/123', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Todo 1 updated',
      }),
    })
    const json = await res.json()

    expect(res.status).toEqual(404)
    expect(json).toEqual({
      message:
        'Failed to execute "update" on the "todo" model: no entity found matching the query "{"id":{"equals":123}}".',
    })
  })

  it('returns a 409 response when updating an entity with primary key of another entity', async () => {
    server.use(...db.todo.toHandlers('rest', 'http://localhost'))

    db.todo.create({
      id: 123,
      title: 'Todo 1',
    })
    db.todo.create({
      id: 456,
      title: 'Todo 2',
    })

    const res = await fetch('http://localhost/todos/123', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 456,
        title: 'Todo 1 updated',
      }),
    })
    const json = await res.json()

    expect(res.status).toEqual(409)
    expect(json).toEqual({
      message:
        'Failed to execute "update" on the "todo" model: the entity with a primary key "456" ("id") already exists.',
    })
  })
})

describe('DELETE /todos/:id', () => {
  it('handles a DELETE request to delete an entity', async () => {
    server.use(...db.todo.toHandlers('rest', 'http://localhost'))

    db.todo.create({
      id: 123,
      title: 'Todo 1',
    })
    db.todo.create({
      id: 456,
      title: 'Todo 2',
    })

    const res = await fetch('http://localhost/todos/456', {
      method: 'DELETE',
    })
    const todo = await res.json()
    expect(res.status).toEqual(200)
    expect(todo).toEqual({
      id: 456,
      title: 'Todo 2',
    })

    const alltodos = await fetch('http://localhost/todos').then((res) =>
      res.json(),
    )
    expect(alltodos).toEqual([
      {
        id: 123,
        title: 'Todo 1',
      },
    ])
  })

  it('returns a 404 response when deleting a non-existing entity', async () => {
    server.use(...db.todo.toHandlers('rest', 'http://localhost'))

    const res = await fetch('http://localhost/todos/456', {
      method: 'DELETE',
    })
    const json = await res.json()

    expect(res.status).toEqual(404)
    expect(json).toEqual({
      message:
        'Failed to execute "delete" on the "todo" model: no entity found matching the query "{"id":{"equals":456}}".',
    })
  })
})
