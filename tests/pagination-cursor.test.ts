import { Collection } from '#/src/collection.js'
import z from 'zod'

const userSchema = z.object({
  id: z.number(),
})

it('returns an empty array if the cursor points at a deleted record', async () => {
  const users = new Collection({ schema: userSchema })
  await users.createMany(5, (index) => ({
    id: index + 1,
  }))

  const cursor = users.findFirst((q) => q.where({ id: 5 }))!
  users.delete(cursor)

  expect(
    users.findMany(undefined, { cursor }),
    'Returns an empty array if the cursor points at a deleted record',
  ).toEqual([])
})

it('returns all the matching records after the cursor', async () => {
  const users = new Collection({ schema: userSchema })
  await users.createMany(10, (index) => ({
    id: index + 1,
  }))

  const cursor = users.findFirst((q) => q.where({ id: 7 }))!

  expect(
    users.findMany(undefined, { cursor }),
    'Supports match-all queries',
  ).toEqual([{ id: 8 }, { id: 9 }, { id: 10 }])
})

it('returns the `take` number of results after the cursor', async () => {
  const users = new Collection({ schema: userSchema })
  await users.createMany(10, (index) => ({
    id: index + 1,
  }))

  const cursor = users.findFirst((q) => q.where({ id: 7 }))!

  expect(
    users.findMany(undefined, { cursor, take: 3 }),
    'Supports match-all queries',
  ).toEqual([{ id: 8 }, { id: 9 }, { id: 10 }])
})

it('supports negative values for `take`', async () => {
  const users = new Collection({ schema: userSchema })
  await users.createMany(10, (index) => ({
    id: index + 1,
  }))

  expect(
    users.findMany(undefined, {
      cursor: users.findFirst((q) => q.where({ id: 10 })),
      take: -3,
    }),
  ).toEqual([{ id: 9 }, { id: 8 }, { id: 7 }])

  expect(
    users.findMany((q) => q.where({ id: (id) => id > 2 }), {
      cursor: users.findFirst((q) => q.where({ id: 8 })),
      take: -3,
    }),
  ).toEqual([{ id: 7 }, { id: 6 }, { id: 5 }])

  expect(
    users.findMany((q) => q.where({ id: (id) => id > 2 }), {
      cursor: users.findFirst((q) => q.where({ id: 3 })),
      take: -3,
    }),
  ).toEqual([{ id: 10 }, { id: 9 }, { id: 8 }])
})
