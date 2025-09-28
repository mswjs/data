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
