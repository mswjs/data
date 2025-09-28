import { Collection } from '#/src/collection.js'
import z from 'zod'

const schema = z.object({
  id: z.number(),
})

it('returns 0 for a collection without any records', async () => {
  const users = new Collection({ schema })
  expect(users.count()).toBe(0)
})

it('returns the total number of records', async () => {
  const users = new Collection({ schema })

  await users.create({ id: 1 })
  expect(users.count()).toBe(1)

  await users.create({ id: 2 })
  expect(users.count()).toBe(2)

  await users.create({ id: 3 })
  expect(users.count()).toBe(3)
})
