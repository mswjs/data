import fetch from 'node-fetch'
import { datatype, name, random } from 'faker'
import { setupServer } from 'msw/node'
import { factory, manyOf, primaryKey } from '@mswjs/data'

const db = factory({
  user: {
    id: primaryKey(datatype.uuid),
    firstName: name.firstName,
    posts: manyOf('post'),
  },
  post: {
    id: primaryKey(datatype.uuid),
    title: random.words,
  },
})

const server = setupServer()

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

it('updates database entity modified via a generated handler', async () => {
  const firstPost = db.post.create({
    title: 'First post',
  })
  const secondPost = db.post.create({
    title: 'Second post',
  })

  // Create a database entity outside of the generated handlers.
  // Bind it to a "mayOf" posts relationship.
  db.user.create({
    id: 'abc-123',
    firstName: 'John',
    posts: [firstPost],
  })

  server.use(...db.user.toHandlers('rest', 'http://localhost'))

  // Update the previously populated "user" instance
  // via the generated request handlers.
  const response = await fetch('http://localhost/users/abc-123', {
    method: 'PUT',
    // Pay attention to compose a proper request,
    // including its "Content-Type" header.
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      posts: [secondPost],
    }),
  })
  const json = await response.json()
  expect(response.status).toEqual(200)
  expect(json).toEqual({
    id: 'abc-123',
    firstName: 'John',
    posts: [secondPost],
  })

  // Query the database directly.
  const user = db.user.findFirst({
    where: {
      id: {
        equals: 'abc-123',
      },
    },
  })
  expect(user).toHaveProperty('posts', [secondPost])
})
