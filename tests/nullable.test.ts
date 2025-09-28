import { Collection } from '#/src/collection.js'
import z from 'zod'

it('supports null as initial value for nullable properties', async () => {
  const users = new Collection({
    schema: z.object({ id: z.number().nullable() }),
  })

  await expect(users.create({ id: null })).resolves.toEqual({ id: null })
})

it('supports searching by nullable properties', async () => {
  const users = new Collection({
    schema: z.object({ id: z.number(), name: z.string().nullable() }),
  })
  await users.create({ id: 1, name: null })
  await users.create({ id: 2, name: 'John' })
  await users.create({ id: 3, name: 'Kate' })
  await users.create({ id: 4, name: null })

  expect(users.findFirst((q) => q.where({ name: null }))).toEqual({
    id: 1,
    name: null,
  })
  expect(
    users.findFirst((q) => q.where({ name: (name) => name !== null })),
  ).toEqual({
    id: 2,
    name: 'John',
  })

  expect(users.findMany((q) => q.where({ name: null }))).toEqual([
    {
      id: 1,
      name: null,
    },
    {
      id: 4,
      name: null,
    },
  ])
  expect(
    users.findMany((q) => q.where({ name: (name) => name !== null })),
  ).toEqual([
    {
      id: 2,
      name: 'John',
    },
    {
      id: 3,
      name: 'Kate',
    },
  ])
})

it('supports updating nullable properties', async () => {
  const users = new Collection({
    schema: z.object({ id: z.number().nullable() }),
  })
  await users.create({ id: null })

  await expect(
    users.update((q) => q.where({ id: null }), {
      data(user) {
        user.id = 123
      },
    }),
  ).resolves.toEqual({
    id: 123,
  })
  expect(users.findFirst((q) => q.where({ id: 123 }))).toEqual({ id: 123 })
})

it('supports nullable one-to-one relation', async () => {
  const countrySchema = z.object({ code: z.string() })
  const userSchema = z.object({
    id: z.number(),
    country: countrySchema.nullable(),
  })

  const users = new Collection({ schema: userSchema })
  const countries = new Collection({ schema: countrySchema })

  await expect(
    users.create({ id: 1, country: null }),
    'Supports null as initial value for nullable relations',
  ).resolves.toEqual({
    id: 1,
    country: null,
  })

  await expect(
    users.update((q) => q.where({ country: null }), {
      async data(user) {
        user.country = await countries.create({ code: 'uk' })
      },
    }),
    'Supports updating a nullable relation to a value',
  ).resolves.toEqual({ id: 1, country: { code: 'uk' } })

  await expect(
    users.update((q) => q.where({ country: { code: 'uk' } }), {
      data(user) {
        user.country = null
      },
    }),
    'Supports updating a nullable relation to null',
  ).resolves.toEqual({ id: 1, country: null })
})

it('supports nullable one-to-many relation', async () => {
  const postSchema = z.object({ title: z.string() })
  const userSchema = z.object({
    id: z.number(),
    posts: z.array(postSchema).nullable(),
  })

  const users = new Collection({ schema: userSchema })
  const posts = new Collection({ schema: postSchema })

  await expect(
    users.create({ id: 1, posts: null }),
    'Supports null as initial value for nullable relations',
  ).resolves.toEqual({
    id: 1,
    posts: null,
  })

  await expect(
    users.update((q) => q.where({ posts: null }), {
      async data(user) {
        user.posts = [await posts.create({ title: 'First' })]
      },
    }),
    'Supports updating a nullable relation to a value',
  ).resolves.toEqual({ id: 1, posts: [{ title: 'First' }] })

  await expect(
    users.update((q) => q.where({ posts: { title: 'First' } }), {
      data(user) {
        user.posts = null
      },
    }),
    'Supports updating a nullable relation to null',
  ).resolves.toEqual({ id: 1, posts: null })
})
