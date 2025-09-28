import { Collection } from '#/src/collection.js'
import { Query } from '#/src/query.js'
import { z } from 'zod'

const schema = z.object({
  id: z.number(),
  name: z.string().optional(),
})

it('returns undefined if no entry matched the query', async () => {
  const users = new Collection({ schema })

  expect(users.findFirst((q) => q.where({ id: 1 }))).toBeUndefined()

  await users.create({ id: 5, name: 'John' })
  expect(users.findFirst((q) => q.where({ id: 1 }))).toBeUndefined()
})

it('errors on empty results in a strict mode', async () => {
  const users = new Collection({ schema })

  expect(() =>
    users.findFirst((q) => q.where({ id: 1 }), { strict: true }),
  ).toThrow(
    'Failed to execute "findFirst" on collection: no record found matching the query',
  )
})

it('returns the first record if called without any arguments', async () => {
  const users = new Collection({ schema })
  const user = await users.create({ id: 1 })

  expect(users.findFirst()).toEqual(user)
})

it('queries by literal value', async () => {
  const users = new Collection({ schema })
  const user = await users.create({ id: 1 })

  expect(users.findFirst((q) => q.where({ id: 1 }))).toEqual(user)
})

it('queries by multiple literal values', async () => {
  const users = new Collection({ schema })
  const user = await users.create({ id: 1, name: 'John' })

  expect(users.findFirst((q) => q.where({ id: 1, name: 'John' }))).toEqual(user)
})

it('supports a query instance as the predicate', async () => {
  const users = new Collection({
    schema: z.object({ id: z.number() }),
  })
  await users.createMany(5, (index) => ({ id: index + 1 }))

  expect(users.findFirst(new Query((user) => user.id === 4))).toEqual({ id: 4 })
})

it('queries by multiple literal values (AND)', async () => {
  const users = new Collection({ schema })

  const user = await users.create({ id: 1, name: 'John' })
  await users.create({ id: 2, name: 'John' })

  expect(
    users.findFirst((q) => q.where({ id: 1 }).and({ name: 'John' })),
  ).toEqual(user)
})

it('queries by multiple literal values (OR)', async () => {
  const users = new Collection({ schema })

  const firstUser = await users.create({ id: 1 })
  const secondUser = await users.create({ id: 2, name: 'Alice' })

  expect(
    users.findFirst((q) => q.where({ id: 1 }).or({ name: 'Alice' })),
    'Returns the first matching entry',
  ).toEqual(firstUser)

  expect(
    users.findFirst((q) => q.where({ id: 2 }).or({ name: 'Alice' })),
    'Returns the closest matching entry',
  ).toEqual(secondUser)
})

it('queries through nested objects', async () => {
  const users = new Collection({
    schema: schema.extend({
      address: z.object({
        street: z.string(),
      }),
    }),
  })

  const user = await users.create({
    id: 1,
    address: { street: 'Main St' },
  })

  expect(
    users.findFirst((q) => q.where({ address: { street: 'Main St' } })),
  ).toEqual(user)
})

it('queries through nested arrays', async () => {
  const users = new Collection({
    schema: schema.extend({
      settings: z.object({
        favoriteNumbers: z.array(z.number()),
      }),
    }),
  })

  await users.create({
    id: 1,
    settings: { favoriteNumbers: [1, 2, 3] },
  })

  expect(
    users.findFirst((q) =>
      q.where({
        settings: { favoriteNumbers: (numbers) => numbers.includes(2) },
      }),
    ),
  ).toBeDefined()
})

it('queries through array models', async () => {
  const numberList = new Collection({
    schema: z.array(z.number()),
  })

  await numberList.create([1, 2, 3])
  await numberList.create([4, 5, 6])

  expect(
    numberList.findFirst((q) => q.where((arr) => arr.includes(2))),
  ).toEqual([1, 2, 3])
})
