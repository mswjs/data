import { Collection, Query } from '#/src/index.js'
import z from 'zod'

const schema = z.object({
  id: z.number(),
  name: z.string().optional(),
})

it('returns an empty array if no entry matched the query', async () => {
  const users = new Collection({ schema })
  await users.create({ id: 1, name: 'Alice' })

  expect(users.findMany((q) => q.where({ name: 'John' }))).toEqual([])
})

it('errors on empty results in a strict mode', async () => {
  const users = new Collection({ schema })

  expect(() =>
    users.findMany((q) => q.where({ name: 'John' }), { strict: true }),
  ).toThrow(
    'Failed to execute "findMany" on collection: no records found matching the query',
  )
})

it('returns all records if called without any arguments', async () => {
  const users = new Collection({ schema })
  const firstUser = await users.create({ id: 1 })
  const secondUser = await users.create({ id: 2 })

  expect(users.findMany()).toEqual([firstUser, secondUser])
})

it('returns a single entry matching the query', async () => {
  const users = new Collection({ schema })

  await users.create({ id: 1, name: 'John' })
  await users.create({ id: 2, name: 'Alice' })

  expect(users.findMany((q) => q.where({ name: 'John' }))).toEqual([
    { id: 1, name: 'John' },
  ])
})

it('returns all entries matching the query', async () => {
  const users = new Collection({ schema })

  await users.create({ id: 1, name: 'John' })
  await users.create({ id: 2, name: 'Alice' })
  await users.create({ id: 3, name: 'John' })

  expect(users.findMany((q) => q.where({ name: 'John' }))).toEqual([
    { id: 1, name: 'John' },
    { id: 3, name: 'John' },
  ])
})

it('supports a query instance as the predicate', async () => {
  const users = new Collection({
    schema: z.object({ id: z.number() }),
  })
  await users.createMany(5, (index) => ({ id: index + 1 }))

  expect(users.findMany(new Query((user) => user.id % 2 === 0))).toEqual([
    { id: 2 },
    { id: 4 },
  ])
})

it('returns all entries matching the query (OR)', async () => {
  const users = new Collection({ schema })

  await users.create({ id: 1, name: 'John' })
  await users.create({ id: 2, name: 'Alice' })
  await users.create({ id: 3, name: 'John' })

  expect(users.findMany((q) => q.where({ id: 1 }).or({ id: 3 }))).toEqual([
    { id: 1, name: 'John' },
    { id: 3, name: 'John' },
  ])

  expect(
    users.findMany((q) => q.where({ id: 999 }).or({ id: (id) => id > 1 })),
  ).toEqual([
    { id: 2, name: 'Alice' },
    { id: 3, name: 'John' },
  ])
})
