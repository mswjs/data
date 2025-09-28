import { kRelationMap } from '#/src/collection.js'
import { Collection } from '#/src/index.js'
import { isRecord } from '#/src/utils.js'
import z from 'zod'

const countrySchema = z.object({
  code: z.string(),
})

const userSchema = z.object({
  id: z.number(),
  country: countrySchema.optional(),
})

it('supports a one-to-one relation', async () => {
  const users = new Collection({ schema: userSchema })
  const countries = new Collection({ schema: countrySchema })

  users.defineRelations(({ one }) => ({
    country: one(countries),
  }))

  const user = await users.create({
    id: 1,
    country: await countries.create({ code: 'us' }),
  })

  expect.soft(user.country).toEqual({ code: 'us' })
  expect
    .soft(users.findFirst((q) => q.where({ country: { code: 'us' } })))
    .toEqual(user)
})

it('supports one-to-one relations in array models', async () => {
  const lists = new Collection({
    schema: z.array(
      z.object({
        id: z.number(),
        country: countrySchema,
      }),
    ),
  })
  const countries = new Collection({ schema: countrySchema })

  lists.defineRelations(({ one }) => ({
    country: one(countries),
  }))

  const list = await lists.create([
    { id: 1, country: await countries.create({ code: 'us' }) },
  ])

  expect.soft(list).toEqual([{ id: 1, country: { code: 'us' } }])
  expect
    .soft(lists.findFirst((q) => q.where({ country: { code: 'us' } })))
    .toEqual(list)
})

it('updates a one-to-one relation with another record', async () => {
  const users = new Collection({ schema: userSchema })
  const countries = new Collection({ schema: countrySchema })

  users.defineRelations(({ one }) => ({
    country: one(countries),
  }))

  await users.create({
    id: 1,
    country: await countries.create({ code: 'us' }),
  })

  const updatedUser = await users.update((q) => q.where({ id: 1 }), {
    async data(user) {
      user.country = await countries.create({ code: 'ca' })
    },
  })

  expect(updatedUser).toEqual({ id: 1, country: { code: 'ca' } })
  expect(users.findFirst((q) => q.where({ country: { code: 'ca' } }))).toEqual(
    updatedUser,
  )
  expect(
    users.findFirst((q) => q.where({ country: { code: 'us' } })),
  ).toBeUndefined()
})

it('updates relational value when the referenced record is updated', async () => {
  const users = new Collection({ schema: userSchema })
  const countries = new Collection({ schema: countrySchema })

  users.defineRelations(({ one }) => ({
    country: one(countries),
  }))

  await users.create({
    id: 1,
    country: await countries.create({ code: 'us' }),
  })

  const updatedCountry = await countries.update(
    (q) => q.where({ code: 'us' }),
    {
      data(country) {
        country.code = 'ca'
      },
    },
  )

  expect(updatedCountry).toEqual({ code: 'ca' })
  expect(users.findFirst((q) => q.where({ country: { code: 'ca' } }))).toEqual({
    id: 1,
    country: { code: 'ca' },
  })
  expect(
    users.findFirst((q) => q.where({ country: { code: 'us' } })),
  ).toBeUndefined()
})

it('supports nested one-to-one relations', async () => {
  const users = new Collection({
    schema: z.object({
      id: z.number(),
      address: z.object({
        get country() {
          return countrySchema
        },
      }),
    }),
  })
  const countries = new Collection({ schema: countrySchema })

  users.defineRelations(({ one }) => ({
    address: {
      country: one(countries),
    },
  }))

  const user = await users.create({
    id: 1,
    address: {
      country: await countries.create({ code: 'us' }),
    },
  })

  expect.soft(user.address.country).toEqual({ code: 'us' })
  expect
    .soft(
      users.findFirst((q) => q.where({ address: { country: { code: 'us' } } })),
    )
    .toEqual(user)
})

it('supports nullable one-to-one relations', async () => {
  const users = new Collection({
    schema: z.object({
      id: z.number(),
      country: countrySchema.nullable(),
    }),
  })
  const countries = new Collection({ schema: countrySchema })

  users.defineRelations(({ one }) => ({
    country: one(countries),
  }))

  const user = await users.create({
    id: 1,
    country: null,
  })

  const schema = z.object({
    id: z.number(),
    country: countrySchema.nullable(),
  })

  expect.soft(user.country).toBeNull()
  expect.soft(users.findFirst((q) => q.where({ country: null }))).toEqual(user)
})

it('updates the relation when the referenced record is deleted', async () => {
  const users = new Collection({
    schema: z.object({
      id: z.number(),
      get country() {
        return countrySchema.optional()
      },
    }),
  })
  const countries = new Collection({ schema: countrySchema })

  users.defineRelations(({ one }) => ({
    country: one(countries),
  }))

  const user = await users.create({
    id: 1,
    country: await countries.create({ code: 'us' }),
  })

  countries.delete((q) => q.where({ code: 'us' }))

  expect.soft(user.country).toBeUndefined()
  expect
    .soft(users.findFirst((q) => q.where({ country: { code: 'us' } })))
    .toBeUndefined()
})

it('applies relation to records created before the relation is defined', async () => {
  const users = new Collection({
    schema: z.object({
      id: z.number(),
      get country() {
        return countrySchema.optional()
      },
    }),
  })
  const countries = new Collection({ schema: countrySchema })

  const user = await users.create({
    id: 1,
    country: await countries.create({ code: 'us' }),
  })

  users.defineRelations(({ one }) => ({
    country: one(countries),
  }))

  expect.soft(user.country).toEqual({ code: 'us' })
  expect.soft(isRecord(user.country)).toBe(true)

  await countries.update((q) => q.where({ code: 'us' }), {
    data(country) {
      country.code = 'uk'
    },
  })

  expect(user.country).toEqual({ code: 'uk' })
  expect(users.findFirst((q) => q.where({ country: { code: 'uk' } }))).toEqual({
    id: 1,
    country: { code: 'uk' },
  })
})

it('supports unique one-to-one relations', async () => {
  const userSchema = z.object({ id: z.number() })
  const postSchema = z.object({
    title: z.string(),
    author: userSchema,
  })

  const users = new Collection({ schema: userSchema })
  const posts = new Collection({ schema: postSchema })

  posts.defineRelations(({ one }) => ({
    author: one(users, { unique: true }),
  }))

  const user = await users.create({ id: 1 })
  const post = await posts.create({ title: 'First', author: user })

  expect.soft(post.author).toEqual(user)
  expect
    .soft(posts.findFirst((q) => q.where({ author: { id: user.id } })))
    .toEqual(post)

  const updatedUser = await users.update(user, {
    data(user) {
      user.id = 2
    },
  })

  expect.soft(post.author).toEqual(updatedUser)
  expect
    .soft(posts.findFirst((q) => q.where({ author: { id: updatedUser!.id } })))
    .toEqual(post)
})

it('errors when updating a unique relation that has already been associated', async () => {
  const userSchema = z.object({ id: z.number() })
  const postSchema = z.object({
    title: z.string(),
    author: userSchema,
  })

  const users = new Collection({ schema: userSchema })
  const posts = new Collection({ schema: postSchema })

  posts.defineRelations(({ one }) => ({
    author: one(users, { unique: true }),
  }))

  const user = await users.create({ id: 1 })
  const firstPost = await posts.create({ title: 'First', author: user })

  expect(firstPost.author).toEqual(user)

  await expect(
    posts.update((q) => q.where({ title: 'First' }), {
      async data(post) {
        post.author = await users.create({ id: 2 })
      },
    }),
  ).rejects.toThrow(
    `Failed to update a unique relation at "author": record already associated with another foreign record`,
  )
})
