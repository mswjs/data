import { Collection } from '#/src/collection.js'
import { z } from 'zod'

const schema = z.object({
  id: z.number(),
  name: z.string(),
})

it('sorts the results by a single key (asc)', async () => {
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

it('sorts the results by a single key (desc)', async () => {
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

it('sorts the results by multiple keys (mixed)', async () => {
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

it('sorts the results by a nested key', async () => {
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

it('sorts the results by a list of sort criteria', async () => {
  const schema = z.object({
    id: z.number(),
    name: z.string(),
    age: z.number(),
  })

  const users = new Collection({ schema })

  await users.create({ id: 1, name: 'John', age: 32 })
  await users.create({ id: 2, name: 'Alice', age: 24 })
  await users.create({ id: 3, name: 'Bob', age: 41 })
  await users.create({ id: 4, name: 'Alice', age: 41 })

  expect(
    users.findMany(undefined, {
      orderBy: [{ age: 'asc' }, { name: 'desc' }],
    }),
  ).toEqual([
    { id: 2, name: 'Alice', age: 24 },
    { id: 1, name: 'John', age: 32 },
    { id: 3, name: 'Bob', age: 41 },
    { id: 4, name: 'Alice', age: 41 },
  ])
})

it('sorts by a relational property', async () => {
  const userSchema = z.object({
    id: z.number(),
    name: z.string(),
    get posts() {
      return z.array(postSchema)
    },
  })
  const postSchema = z.object({
    id: z.number(),
    title: z.string(),
    get author() {
      return userSchema.optional()
    },
  })

  const users = new Collection({ schema: userSchema })
  const posts = new Collection({ schema: postSchema })

  users.defineRelations(({ many }) => ({
    posts: many(posts),
  }))
  posts.defineRelations(({ one }) => ({
    author: one(users, { unique: true }),
  }))

  const john = await users.create({
    id: 1,
    name: 'John',
    posts: await posts.createMany(2, (index) => ({
      id: index + 1,
      title: `Post ${index + 1}`,
    })),
  })

  const alice = await users.create({
    id: 2,
    name: 'Alice',
    posts: await posts.createMany(2, (index) => ({
      id: index + 3,
      title: `Post ${index + 3}`,
    })),
  })

  expect(
    posts.findMany(undefined, {
      orderBy: {
        author: {
          name: 'asc',
        },
      },
    }),
  ).toEqual([
    { id: 3, title: 'Post 3', author: alice },
    { id: 4, title: 'Post 4', author: alice },
    { id: 1, title: 'Post 1', author: john },
    { id: 2, title: 'Post 2', author: john },
  ])
})
