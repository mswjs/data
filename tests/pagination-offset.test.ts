import { Collection } from '#/src/collection.js'
import z from 'zod'

const userSchema = z.object({
  id: z.number(),
})

it('ignores `takes` for non-matching queries', async () => {
  const users = new Collection({ schema: userSchema })

  expect(
    users.findMany((q) => q.where({ id: 5000 }), { take: 3 }),
    'Supports non-matching queries',
  ).toEqual([])
})

it('returns the `take` number of results', async () => {
  const users = new Collection({ schema: userSchema })
  await users.createMany(10, (index) => ({
    id: index + 1,
  }))

  expect(
    users.findMany(undefined, { take: 3 }),
    'Supports match-all queries',
  ).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])

  expect(
    users.findMany((q) => q.where({ id: (id) => id > 2 }), { take: 3 }),
    'Supports matching queries',
  ).toEqual([{ id: 3 }, { id: 4 }, { id: 5 }])
})

it('returns the find results as-is if they are fewer than the `take` value', async () => {
  const users = new Collection({ schema: userSchema })
  await users.createMany(3, (index) => ({
    id: index + 1,
  }))

  expect(
    users.findMany(undefined, { take: 10 }),
    'Supports match-all queries',
  ).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])

  expect(
    users.findMany((q) => q.where({ id: 2 }), { take: 10 }),
    'Supports regular queries',
  ).toEqual([{ id: 2 }])
})

it('skips the provided number of results', async () => {
  const users = new Collection({ schema: userSchema })
  await users.createMany(10, (index) => ({
    id: index + 1,
  }))

  expect(
    users.findMany(undefined, { skip: 5, take: 3 }),
    'Supports match-all queries',
  ).toEqual([{ id: 6 }, { id: 7 }, { id: 8 }])

  expect(
    users.findMany((q) => q.where({ id: (id) => id > 2 }), {
      skip: 1,
      take: 1,
    }),
    'Supports regular queries',
  ).toEqual([{ id: 4 }])

  expect(
    users.findMany((q) => q.where({ id: 5000 }), { skip: 1, take: 3 }),
    'Supports non-matching queries',
  ).toEqual([])
})

it('treats `skip` as slice if `take` was not provided', async () => {
  const users = new Collection({ schema: userSchema })
  await users.createMany(10, (index) => ({
    id: index + 1,
  }))

  expect(
    users.findMany(undefined, { skip: 7 }),
    'Supports match-all queries',
  ).toEqual([{ id: 8 }, { id: 9 }, { id: 10 }])

  expect(
    users.findMany((q) => q.where({ id: (id) => id > 2 }), {
      skip: 5,
    }),
    'Supports regular queries',
  ).toEqual([{ id: 8 }, { id: 9 }, { id: 10 }])
})

it('returns an empty array if all the results were skipped', async () => {
  const users = new Collection({ schema: userSchema })
  await users.createMany(10, (index) => ({
    id: index + 1,
  }))

  expect(
    users.findMany(undefined, { skip: 10, take: 3 }),
    'Supports match-all queries',
  ).toEqual([])

  expect(
    users.findMany((q) => q.where({ id: (id) => id > 2 }), {
      skip: 8,
      take: 1,
    }),
    'Supports regular queries',
  ).toEqual([])
})

it('throws if providing an invalid value for `skip`', async () => {
  const users = new Collection({ schema: userSchema })
  await users.createMany(10, (index) => ({
    id: index + 1,
  }))

  expect(() => users.findMany(undefined, { skip: -1 })).toThrow(
    'Failed to query the collection: expected the "skip" pagination option to be a number larger or equal to 0 but got -1',
  )

  expect(() =>
    users.findMany(undefined, {
      // @ts-expect-error Intentionally invalid value.
      skip: false,
    }),
  ).toThrow(
    'Failed to query the collection: expected the "skip" pagination option to be a number larger or equal to 0 but got false',
  )

  expect(() =>
    users.findMany(undefined, {
      // @ts-expect-error Intentionally invalid value.
      skip: null,
    }),
  ).toThrow(
    'Failed to query the collection: expected the "skip" pagination option to be a number larger or equal to 0 but got null',
  )

  expect(() =>
    users.findMany(undefined, {
      // @ts-expect-error Intentionally invalid value.
      skip: 'invalid',
    }),
  ).toThrow(
    'Failed to query the collection: expected the "skip" pagination option to be a number larger or equal to 0 but got "invalid"',
  )
})

it('supports negative values for `take`', async () => {
  const users = new Collection({ schema: userSchema })
  await users.createMany(10, (index) => ({
    id: index + 1,
  }))

  expect(
    users.findMany(undefined, { take: -3 }),
    'Returns the last n results if `skip` is not provided',
  ).toEqual([{ id: 10 }, { id: 9 }, { id: 8 }])

  expect(users.findMany(undefined, { skip: 3, take: -3 })).toEqual([
    { id: 7 },
    { id: 6 },
    { id: 5 },
  ])

  expect(
    users.findMany((q) => q.where({ id: (id) => id > 2 }), { take: -3 }),
    'Does not loop the results',
  ).toEqual([{ id: 10 }, { id: 9 }, { id: 8 }])

  expect(
    users.findMany((q) => q.where({ id: (id) => id > 2 }), {
      skip: 3,
      take: -3,
    }),
  ).toEqual([{ id: 7 }, { id: 6 }, { id: 5 }])
})
