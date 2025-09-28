import { Collection } from '#/src/index.js'
import z from 'zod'

const schema = z.object({
  id: z.number(),
  name: z.string(),
})

it('supports AND conditions when querying', async () => {
  const users = new Collection({ schema })
  await users.create({ id: 1, name: 'John' })
  await users.create({ id: 2, name: 'Alice' })
  await users.create({ id: 3, name: 'Bob' })

  expect(
    users.findFirst((q) =>
      q.where({ id: (id) => id > 1 }).and({ name: 'Bob' }),
    ),
  ).toEqual({
    id: 3,
    name: 'Bob',
  })

  expect(
    users.findFirst((q) =>
      q.and(q.where({ id: (id) => id > 1 }), q.where({ name: 'Bob' })),
    ),
  ).toEqual({
    id: 3,
    name: 'Bob',
  })
})
