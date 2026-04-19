import { Collection } from '#/src/index.js'
import { z } from 'zod'

const userSchema = z.object({
  id: z.number(),
})

const postSchema = z.object({
  title: z.string(),
  get author() {
    return userSchema.optional()
  },
})

it('supports many-to-one relations', async () => {
  const users = new Collection({ schema: userSchema })
  const posts = new Collection({ schema: postSchema })

  posts.defineRelations(({ one }) => ({
    author: one(users),
  }))

  const user = await users.create({ id: 1 })

  const firstPost = await posts.create({ title: 'First', author: user })
  const secondPost = await posts.create({ title: 'Second', author: user })

  expect.soft(firstPost.author).toEqual(user)
  expect.soft(secondPost.author).toEqual(user)

  expect
    .soft(posts.findFirst((q) => q.where({ title: 'First' })))
    .toEqual({ title: 'First', author: { id: 1 } })
  expect
    .soft(posts.findFirst((q) => q.where({ title: 'Second' })))
    .toEqual({ title: 'Second', author: { id: 1 } })
})

it('scopes a many-to-one relation update to the targeted record', async () => {
  const users = new Collection({ schema: userSchema })
  const posts = new Collection({ schema: postSchema })

  posts.defineRelations(({ one }) => ({
    author: one(users),
  }))

  const userOne = await users.create({ id: 1 })
  const userTwo = await users.create({ id: 2 })

  const firstPost = await posts.create({ title: 'First', author: userOne })
  await posts.create({ title: 'Second', author: userTwo })

  await posts.update(firstPost, {
    data(post) {
      post.author = userTwo
    },
  })
  await posts.update(firstPost, {
    data(post) {
      post.author = userOne
    },
  })

  expect(posts.all()).toEqual([
    { title: 'First', author: { id: 1 } },
    { title: 'Second', author: { id: 2 } },
  ])
})

it('updates a many-to-one relation to a foreign record already associated with another owner', async () => {
  const languageSchema = z.object({ code: z.string() })
  const userSchema = z.object({
    name: z.string(),
    language: languageSchema,
  })

  const languages = new Collection({ schema: languageSchema })
  const users = new Collection({ schema: userSchema })

  users.defineRelations(({ one }) => ({
    language: one(languages, { unique: false }),
  }))

  const langPt = await languages.create({ code: 'pt' })
  const langEn = await languages.create({ code: 'en' })

  const userOne = await users.create({ name: 'John', language: langPt })
  await users.create({ name: 'Kate', language: langEn })

  await users.update(userOne, {
    data(user) {
      user.language = langEn
    },
  })

  expect(users.all()).toEqual([
    { name: 'John', language: { code: 'en' } },
    { name: 'Kate', language: { code: 'en' } },
  ])
})

it("scopes nested updates to the updated owner's foreign record", async () => {
  const countrySchema = z.object({ code: z.string() })
  const userSchema = z.object({
    name: z.string(),
    country: countrySchema,
  })

  const countries = new Collection({ schema: countrySchema })
  const users = new Collection({ schema: userSchema })

  users.defineRelations(({ one }) => ({
    country: one(countries),
  }))

  const us = await countries.create({ code: 'us' })
  const ca = await countries.create({ code: 'ca' })

  const userOne = await users.create({ name: 'John', country: us })
  await users.create({ name: 'Kate', country: ca })

  await users.update(userOne, {
    data(user) {
      user.country.code = 'uk'
    },
  })

  expect(countries.all()).toEqual([{ code: 'uk' }, { code: 'ca' }])
})
