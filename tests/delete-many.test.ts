import { Collection } from '#/src/collection.js'
import { Query } from '#/src/query.js'
import z from 'zod'

const schema = z.object({
  id: z.number(),
})

it('returns an empty array if no record matches the query', async () => {
  const users = new Collection({ schema })
  await users.create({ id: 1 })

  expect(users.deleteMany((q) => q.where({ id: (id) => id > 1 }))).toEqual([])
})

it('errors on empty results in a strict mode', async () => {
  const users = new Collection({ schema })

  expect(() =>
    users.deleteMany((q) => q.where({ id: 123 }), { strict: true }),
  ).toThrow(
    'Failed to execute "deleteMany" on collection: no records found matching the query',
  )
})

it('deletes all matching records', async () => {
  const users = new Collection({ schema })

  await users.create({ id: 1 })
  await users.create({ id: 2 })
  await users.create({ id: 3 })
  await users.create({ id: 4 })

  expect
    .soft(users.deleteMany((q) => q.where({ id: (id) => id > 1 && id < 4 })))
    .toEqual([{ id: 2 }, { id: 3 }])
  expect.soft(users.all()).toEqual([{ id: 1 }, { id: 4 }])
})

it('supports a query instance as the predicate', async () => {
  const users = new Collection({
    schema: z.object({ id: z.number() }),
  })
  await users.createMany(5, (index) => ({ id: index + 1 }))

  expect(users.deleteMany(new Query((user) => user.id % 2 === 0))).toEqual([
    { id: 2 },
    { id: 4 },
  ])
  expect(users.all()).toEqual([{ id: 1 }, { id: 3 }, { id: 5 }])
})

it('sorts the deleted records by given criteria', async () => {
  const users = new Collection({ schema: schema.extend({ name: z.string() }) })

  await users.create({ id: 1, name: 'John' })
  await users.create({ id: 2, name: 'Sarah' })
  await users.create({ id: 3, name: 'Alice' })
  await users.create({ id: 4, name: 'Bob' })

  expect
    .soft(
      users.deleteMany((q) => q.where({ id: (id) => id > 1 && id < 4 }), {
        orderBy: { name: 'asc' },
      }),
    )
    .toEqual([
      { id: 3, name: 'Alice' },
      { id: 2, name: 'Sarah' },
    ])
  expect.soft(users.all()).toEqual([
    { id: 1, name: 'John' },
    { id: 4, name: 'Bob' },
  ])
})
