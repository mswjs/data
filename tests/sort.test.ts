import { Collection } from '#/src/collection.js'
import z from 'zod'

const schema = z.object({
  id: z.number(),
  name: z.string(),
})

it('sorts the find results by a single key (asc)', async () => {
  const users = new Collection({ schema })

  await users.create({ id: 1, name: 'John' })
  await users.create({ id: 2, name: 'Alice' })
  await users.create({ id: 3, name: 'Bob' })

  expect(
    users.findMany(undefined, {
      orderBy: { name: 'asc' },
    }),
  ).toEqual([
    { id: 2, name: 'Alice' },
    { id: 3, name: 'Bob' },
    { id: 1, name: 'John' },
  ])

  expect(
    users.findMany((q) => q.where({ name: (name) => name.includes('o') }), {
      orderBy: { name: 'asc' },
    }),
  ).toEqual([
    { id: 3, name: 'Bob' },
    { id: 1, name: 'John' },
  ])
})

it('sorts the find results by a single key (desc)', async () => {
  const users = new Collection({ schema })

  await users.create({ id: 1, name: 'John' })
  await users.create({ id: 2, name: 'Alice' })
  await users.create({ id: 3, name: 'Bob' })

  expect(
    users.findMany(undefined, {
      orderBy: { name: 'desc' },
    }),
  ).toEqual([
    { id: 1, name: 'John' },
    { id: 3, name: 'Bob' },
    { id: 2, name: 'Alice' },
  ])

  expect(
    users.findMany((q) => q.where({ name: (name) => name.includes('o') }), {
      orderBy: { name: 'desc' },
    }),
  ).toEqual([
    { id: 1, name: 'John' },
    { id: 3, name: 'Bob' },
  ])
})

it('sorts the find results by multiple keys (mixed)', async () => {
  const users = new Collection({ schema })
  await users.create({ id: 1, name: 'John' })
  await users.create({ id: 2, name: 'Alice' })
  await users.create({ id: 3, name: 'Bob' })
  await users.create({ id: 4, name: 'Bob' })

  expect(
    users.findMany(undefined, {
      orderBy: { name: 'asc', id: 'desc' },
    }),
  ).toEqual([
    { id: 2, name: 'Alice' },
    { id: 4, name: 'Bob' },
    { id: 3, name: 'Bob' },
    { id: 1, name: 'John' },
  ])

  expect(
    users.findMany((q) => q.where({ name: (name) => name.includes('o') }), {
      orderBy: { name: 'asc', id: 'desc' },
    }),
  ).toEqual([
    { id: 4, name: 'Bob' },
    { id: 3, name: 'Bob' },
    { id: 1, name: 'John' },
  ])
})

it('sorts the find results by a nested key', async () => {
  const users = new Collection({
    schema: schema.extend({
      address: z.object({
        street: z.string(),
      }),
    }),
  })

  await users.create({ id: 1, name: 'John', address: { street: 'C' } })
  await users.create({ id: 2, name: 'Alice', address: { street: 'A' } })
  await users.create({ id: 3, name: 'Bob', address: { street: 'B' } })

  expect(
    users.findMany(undefined, {
      orderBy: { address: { street: 'asc' } },
    }),
  ).toEqual([
    { id: 2, name: 'Alice', address: { street: 'A' } },
    { id: 3, name: 'Bob', address: { street: 'B' } },
    { id: 1, name: 'John', address: { street: 'C' } },
  ])

  expect(
    users.findMany((q) => q.where({ name: (name) => name.includes('o') }), {
      orderBy: { address: { street: 'asc' } },
    }),
  ).toEqual([
    { id: 3, name: 'Bob', address: { street: 'B' } },
    { id: 1, name: 'John', address: { street: 'C' } },
  ])
})
