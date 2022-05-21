import fetch from 'node-fetch'
import { faker } from '@faker-js/faker'
import { setupServer } from 'msw/node'
import { factory, primaryKey, drop } from '../../src'

const db = factory({
  user: {
    id: primaryKey(faker.datatype.uuid),
    firstName: String,
    age: Number,
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

async function executeQuery(args: {
  query: string
  variables?: Record<string, any>
}) {
  const res = await fetch('http://localhost', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  })

  return res.json()
}

it('supports querying all the users', async () => {
  server.use(...db.user.toHandlers('graphql', 'http://localhost'))
  db.user.create({ firstName: 'John' })
  db.user.create({ firstName: 'Kate' })
  db.user.create({ firstName: 'Joseph' })

  const res = await executeQuery({
    query: `
      query GetUsers {
        users {
          firstName
        }
      }
    `,
  })

  expect(res).toEqual({
    data: {
      users: [
        {
          firstName: 'John',
        },
        {
          firstName: 'Kate',
        },
        {
          firstName: 'Joseph',
        },
      ],
    },
  })
})

it('supports offset pagination when querying all users', async () => {
  server.use(...db.user.toHandlers('graphql', 'http://localhost'))
  db.user.create({ firstName: 'John' })
  db.user.create({ firstName: 'Kate' })
  db.user.create({ firstName: 'Joseph' })
  db.user.create({ firstName: 'Eva' })

  const res = await executeQuery({
    query: `
      query GetUsers {
        users(skip: 1, take: 2) {
          firstName
        }
      }
    `,
  })

  expect(res).toEqual({
    data: {
      users: [
        {
          firstName: 'Kate',
        },
        {
          firstName: 'Joseph',
        },
      ],
    },
  })
})

it('supports cursor pagination when querying all users', async () => {
  server.use(...db.user.toHandlers('graphql', 'http://localhost'))
  db.user.create({ id: 'abc-123', firstName: 'John' })
  db.user.create({ id: 'def-456', firstName: 'Kate' })
  db.user.create({ id: 'ghi-789', firstName: 'Joseph' })
  db.user.create({ id: 'xyz-321', firstName: 'Eva' })

  const res = await executeQuery({
    query: `
      query GetUsers {
        users(cursor: "ghi-789", take: 2) {
          firstName
        }
      }
    `,
  })

  expect(res).toEqual({
    data: {
      users: [
        {
          firstName: 'Eva',
        },
      ],
    },
  })
})

it('supports querying all users by a field', async () => {
  server.use(...db.user.toHandlers('graphql', 'http://localhost'))
  db.user.create({ firstName: 'John', age: 22 })
  db.user.create({ firstName: 'Kate', age: 16 })
  db.user.create({ firstName: 'Joseph', age: 38 })

  const res = await executeQuery({
    query: `
      query GetAdults {
        users(where: { age: { gte: 18 } }) {
          firstName
        }
      }
    `,
  })

  expect(res).toEqual({
    data: {
      users: [
        {
          firstName: 'John',
        },
        {
          firstName: 'Joseph',
        },
      ],
    },
  })
})

it('supports querying a user by the primary key', async () => {
  server.use(...db.user.toHandlers('graphql', 'http://localhost'))
  db.user.create({ id: 'abc-123', firstName: 'John' })
  db.user.create({ id: 'def-456', firstName: 'Kate' })
  db.user.create({ id: 'ghi-789', firstName: 'Joseph' })

  const res = await executeQuery({
    query: `
      query GetUser($id: ID!) {
        user(where: { id: { equals: $id } }) {
          id
          firstName
        }
      }
    `,
    variables: {
      id: 'def-456',
    },
  })

  expect(res).toEqual({
    data: {
      user: {
        id: 'def-456',
        firstName: 'Kate',
      },
    },
  })
})

it('supports querying a user by any field', async () => {
  server.use(...db.user.toHandlers('graphql', 'http://localhost'))
  db.user.create({ id: 'abc-123', firstName: 'John', age: 16 })
  db.user.create({ id: 'def-456', firstName: 'Kate', age: 17 })
  db.user.create({ id: 'ghi-789', firstName: 'Joseph', age: 22 })

  const res = await executeQuery({
    query: `
      query GetAdult {
        user(where: { age: { gte: 22 } }) {
          id
          firstName
        }
      }
    `,
  })

  expect(res).toEqual({
    data: {
      user: {
        id: 'ghi-789',
        firstName: 'Joseph',
      },
    },
  })
})

it('supports creating a new user', async () => {
  server.use(...db.user.toHandlers('graphql', 'http://localhost'))

  const res = await executeQuery({
    query: `
      mutation CreateUser($input: UserInput!) {
        createUser(data: $input) {
          firstName
          age
        }
      }
    `,
    variables: {
      input: {
        firstName: 'Kate',
        age: 27,
      },
    },
  })

  expect(res).toEqual({
    data: {
      createUser: {
        age: 27,
        firstName: 'Kate',
      },
    },
  })
})

it('supports updating a user', async () => {
  server.use(...db.user.toHandlers('graphql', 'http://localhost'))
  db.user.create({ id: 'abc-123', firstName: 'John', age: 16 })
  db.user.create({ id: 'def-456', firstName: 'Kate', age: 17 })

  const res = await executeQuery({
    query: `
      mutation UpdateUser($input: UserInput!) {
        updateUser(
          where: { firstName: { equals: "Kate" } }
          data: $input
        ) {
          firstName
          age
        }
      }
    `,
    variables: {
      input: {
        age: 24,
      },
    },
  })

  expect(res).toEqual({
    data: {
      updateUser: {
        age: 24,
        firstName: 'Kate',
      },
    },
  })
})

it('supports updating multiple users', async () => {
  server.use(...db.user.toHandlers('graphql', 'http://localhost'))
  db.user.create({ id: 'abc-123', firstName: 'John', age: 17 })
  db.user.create({ id: 'def-456', firstName: 'Kate', age: 24 })
  db.user.create({ id: 'ghi-789', firstName: 'Joseph', age: 14 })

  const res = await executeQuery({
    query: `
      mutation UpdateUser($input: UserInput!) {
        updateUsers(
          where: { age: { lt: 18 } }
          data: $input
        ) {
          id
          firstName
          age
        }
      }
    `,
    variables: {
      input: {
        firstName: 'Mr. Clone',
      },
    },
  })

  expect(res).toEqual({
    data: {
      updateUsers: [
        {
          id: 'abc-123',
          age: 17,
          firstName: 'Mr. Clone',
        },
        {
          id: 'ghi-789',
          age: 14,
          firstName: 'Mr. Clone',
        },
      ],
    },
  })
})

it('supports deleting a user by the primary key', async () => {
  server.use(...db.user.toHandlers('graphql', 'http://localhost'))
  db.user.create({ id: 'abc-123', firstName: 'John' })
  db.user.create({ id: 'def-456', firstName: 'Kate' })
  db.user.create({ id: 'ghi-789', firstName: 'Joseph' })

  const res = await executeQuery({
    query: `
      mutation DeleteUser {
        deleteUser(
          where: { id: { equals: "def-456" } }
        ) {
          id
          firstName
        }
      }
    `,
  })

  expect(res).toEqual({
    data: {
      deleteUser: {
        id: 'def-456',
        firstName: 'Kate',
      },
    },
  })
})

it('supports deleting a user by any field', async () => {
  server.use(...db.user.toHandlers('graphql', 'http://localhost'))
  db.user.create({ id: 'abc-123', firstName: 'John' })
  db.user.create({ id: 'def-456', firstName: 'Kate' })
  db.user.create({ id: 'ghi-789', firstName: 'Joseph' })

  const res = await executeQuery({
    query: `
      mutation DeleteUser {
        deleteUser(
          where: { firstName: { equals: "John" } }
        ) {
          id
          firstName
        }
      }
    `,
  })

  expect(res).toEqual({
    data: {
      deleteUser: {
        id: 'abc-123',
        firstName: 'John',
      },
    },
  })
})

it('supports deleting multiple users', async () => {
  server.use(...db.user.toHandlers('graphql', 'http://localhost'))
  db.user.create({ id: 'abc-123', firstName: 'John', age: 17 })
  db.user.create({ id: 'def-456', firstName: 'Kate', age: 24 })
  db.user.create({ id: 'ghi-789', firstName: 'Joseph', age: 14 })

  const res = await executeQuery({
    query: `
      mutation DeleteUsers {
        deleteUsers(
          where: { age: { lt: 18 } }
        ) {
          id
          firstName
          age
        }
      }
    `,
  })

  expect(res).toEqual({
    data: {
      deleteUsers: [
        {
          id: 'abc-123',
          firstName: 'John',
          age: 17,
        },
        {
          id: 'ghi-789',
          firstName: 'Joseph',
          age: 14,
        },
      ],
    },
  })
})
