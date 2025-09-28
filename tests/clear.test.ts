import { Collection } from '#/src/collection.js'
import z from 'zod'

const schema = z.object({ id: z.number() })

it('does nothing when called on an empty collection', async () => {
  const users = new Collection({ schema })
  users.clear()

  expect(users.all()).toEqual([])
})

it('deletes all records in the collection', async () => {
  const users = new Collection({ schema })
  await users.create({ id: 1 })

  users.clear()
  expect(users.all()).toEqual([])

  await users.create({ id: 2 })
  await users.create({ id: 3 })

  users.clear()
  expect(users.all()).toEqual([])
})
