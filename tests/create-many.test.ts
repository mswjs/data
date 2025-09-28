import { Collection } from '#/src/collection.js'
import z from 'zod'

const schema = z.object({
  id: z.number(),
})

it('creates multiple records', async () => {
  const users = new Collection({ schema })

  await expect(
    users.createMany(5, (index) => ({ id: index + 1 })),
  ).resolves.toEqual([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }])
})
