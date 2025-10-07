import { Collection, Query } from '#/src/index.js'
import z from 'zod'

const userSchema = z.object({
  id: z.number(),
  name: z.string(),
})

it('errors on empty results in a strict mode', async () => {
  const users = new Collection({ schema: userSchema })

  await expect(
    users.updateMany((q) => q.where({ id: 123 }), {
      data(user) {
        user.name = 'Kate'
      },
      strict: true,
    }),
  ).rejects.toThrow(
    'Failed to execute "updateMany" on collection: no records found matching the query',
  )
})

it('updates all records matching the query', async () => {
  const users = new Collection({ schema: userSchema })

  await users.create({ id: 1, name: 'John' })
  await users.create({ id: 2, name: 'Alice' })
  await users.create({ id: 3, name: 'Johnatan' })

  const updatedUsers = await users.updateMany(
    (q) => q.where({ name: (name) => name.startsWith('John') }),
    {
      data(user) {
        user.name = user.name.toUpperCase()
      },
    },
  )

  expect.soft(updatedUsers, 'Returns the updated records').toEqual([
    { id: 1, name: 'JOHN' },
    { id: 3, name: 'JOHNATAN' },
  ])
  expect.soft(users.all(), 'Updates records in the store').toEqual([
    { id: 1, name: 'JOHN' },
    { id: 2, name: 'Alice' },
    { id: 3, name: 'JOHNATAN' },
  ])
})

it('supports a query instance as the predicate', async () => {
  const users = new Collection({
    schema: z.object({ id: z.number() }),
  })
  await users.createMany(5, (index) => ({ id: index + 1 }))

  await expect(
    users.updateMany(new Query((user) => user.id % 2 === 0), {
      data(user) {
        user.id = user.id + 123
      },
    }),
  ).resolves.toEqual([{ id: 125 }, { id: 127 }])
})

it('supports a function as the root-level `data` argument', async () => {
  const users = new Collection({ schema: userSchema })

  await users.create({ id: 1, name: 'John' })
  await users.create({ id: 2, name: 'Alice' })
  await users.create({ id: 3, name: 'Johnatan' })

  const updatedUsers = await users.updateMany(
    (q) => q.where({ name: (name) => name.startsWith('John') }),
    {
      data(user) {
        user.name = `${user.name.toUpperCase()}${user.id}`
      },
    },
  )

  expect.soft(updatedUsers, 'Returns the updated records').toEqual([
    { id: 1, name: 'JOHN1' },
    { id: 3, name: 'JOHNATAN3' },
  ])
  expect.soft(users.all(), 'Updates records in the store').toEqual([
    { id: 1, name: 'JOHN1' },
    { id: 2, name: 'Alice' },
    { id: 3, name: 'JOHNATAN3' },
  ])
})

it('supports updating nested arrays', async () => {
  const users = new Collection({
    schema: z.object({
      id: z.number(),
      numbers: z.array(z.number()),
    }),
  })

  await users.create({ id: 1, numbers: [] })
  await users.create({ id: 2, numbers: [] })

  await expect(
    users.updateMany(
      (q) => q.where({ numbers: (numbers) => numbers.length === 0 }),
      {
        data(user) {
          user.numbers.push(1)
        },
      },
    ),
  ).resolves.toEqual([
    {
      id: 1,
      numbers: [1],
    },
    {
      id: 2,
      numbers: [1],
    },
  ])
  expect(
    users.findMany((q) =>
      q.where({ numbers: (numbers) => numbers.includes(1) }),
    ),
  ).toEqual([
    {
      id: 1,
      numbers: [1],
    },
    {
      id: 2,
      numbers: [1],
    },
  ])
})

it('orders updated records by the given criteria', async () => {
  const users = new Collection({ schema: userSchema })

  await users.create({ id: 1, name: 'John' })
  await users.create({ id: 2, name: 'Alice' })
  await users.create({ id: 3, name: 'Johnatan' })

  const nextUsers = await users.updateMany(
    (q) => q.where({ name: (name) => name.startsWith('John') }),
    {
      data(user) {
        user.name = user.name.toUpperCase()
      },
      orderBy: { id: 'desc' },
    },
  )

  expect.soft(nextUsers).toEqual([
    { id: 3, name: 'JOHNATAN' },
    { id: 1, name: 'JOHN' },
  ])
  expect.soft(users.all(), 'Updates records in the store').toEqual([
    { id: 1, name: 'JOHN' },
    { id: 2, name: 'Alice' },
    { id: 3, name: 'JOHNATAN' },
  ])
})

it('re-applies the schema on updates', async () => {
  const users = new Collection({
    schema: userSchema
      .extend({
        email: z.email().optional(),
      })
      .transform((user) => {
        user.email = `${user.name.toLowerCase()}@mail.com`
        return user
      }),
  })

  await users.create({ id: 1, name: 'John' })
  await users.create({ id: 2, name: 'Alice' })
  await users.create({ id: 3, name: 'Johnatan' })

  const nextUsers = await users.updateMany(
    (q) => q.where({ name: (name) => name.startsWith('John') }),
    {
      data(user) {
        user.name = 'Joey'
      },
    },
  )

  expect.soft(nextUsers, 'Returns the updated records').toEqual([
    { id: 1, name: 'Joey', email: 'joey@mail.com' },
    { id: 3, name: 'Joey', email: 'joey@mail.com' },
  ])
  expect.soft(users.all(), 'Updates records in the store').toEqual([
    { id: 1, name: 'Joey', email: 'joey@mail.com' },
    { id: 2, name: 'Alice', email: 'alice@mail.com' },
    { id: 3, name: 'Joey', email: 'joey@mail.com' },
  ])
})
