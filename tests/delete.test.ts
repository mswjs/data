import { Collection } from '#/src/collection.js'
import { Query } from '#/src/query.js'
import z from 'zod'

const schema = z.object({
  id: z.number(),
})

it('returns undefined if no record matches the query', async () => {
  const users = new Collection({ schema })
  await users.create({ id: 1 })

  expect(users.delete((q) => q.where({ id: 3 }))).toBeUndefined()
})

it('errors on empty results in a strict mode', async () => {
  const users = new Collection({ schema })

  expect(() =>
    users.delete((q) => q.where({ id: 123 }), { strict: true }),
  ).toThrow(
    'Failed to execute "delete" on collection: no record found matching the query',
  )
})

it('deletes a matching record', async () => {
  const users = new Collection({ schema })

  await users.create({ id: 1 })
  await users.create({ id: 2 })
  await users.create({ id: 3 })

  expect.soft(users.delete((q) => q.where({ id: 2 }))).toEqual({ id: 2 })
  expect.soft(users.all()).toEqual([{ id: 1 }, { id: 3 }])
})

it('supports a query instance as the predicate', async () => {
  const users = new Collection({
    schema: z.object({ id: z.number() }),
  })
  await users.createMany(5, (index) => ({ id: index + 1 }))

  expect(users.delete(new Query((user) => user.id === 4))).toEqual({ id: 4 })
  expect(users.all()).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 5 }])
})
