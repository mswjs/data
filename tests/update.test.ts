import { Collection, Query } from '#/src/index.js'
import z from 'zod'

const schema = z.object({ id: z.number(), name: z.string() })

it('returns undefined if updating a non-matching record', async () => {
  const users = new Collection({ schema })
  await users.create({ id: 1, name: 'John' })

  const updatedUser = await users.update((q) => q.where({ name: 'Katelyn' }), {
    data(user) {
      user.name = 'Kate'
    },
  })

  expect.soft(updatedUser).toBeUndefined()
  expect.soft(users.findFirst((q) => q.where({ name: 'Kate' }))).toBeUndefined()
})

it('errors on empty results in a strict mode', async () => {
  const users = new Collection({ schema })

  await expect(
    users.update((q) => q.where({ id: 123 }), {
      data(user) {
        user.name = 'Kate'
      },
      strict: true,
    }),
  ).rejects.toThrow(
    'Failed to execute "update" on collection: no record found matching the query',
  )
})

it('updates a matching record', async () => {
  const users = new Collection({ schema })
  await users.create({ id: 1, name: 'John' })

  const updatedUser = await users.update((q) => q.where({ name: 'John' }), {
    data(user) {
      user.name = 'Johnatan'
    },
  })

  expect(updatedUser, 'Returns the updated user').toEqual({
    id: 1,
    name: 'Johnatan',
  })

  expect
    .soft(
      users.findFirst((q) => q.where({ name: 'Johnatan' })),
      'Updates the user in the collection',
    )
    .toEqual(updatedUser)
  expect.soft(users.findFirst((q) => q.where({ name: 'John' }))).toBeUndefined()
})

it('supports a query instance as the predicate', async () => {
  const users = new Collection({
    schema: z.object({ id: z.number() }),
  })
  await users.createMany(5, (index) => ({ id: index + 1 }))

  await expect(
    users.update(new Query((user) => user.id === 3), {
      data(user) {
        user.id = user.id + 123
      },
    }),
  ).resolves.toEqual({ id: 126 })
})

it('supports a function as the root-level `data` argument', async () => {
  const users = new Collection({ schema })
  await users.create({ id: 1, name: 'John' })

  const updatedUser = await users.update((q) => q.where({ name: 'John' }), {
    data(user) {
      user.name = `${user.name.toUpperCase()}${user.id}`
    },
  })

  expect.soft(updatedUser, 'Returns the updated user').toEqual({
    id: 1,
    name: 'JOHN1',
  })
  expect
    .soft(users.findFirst((q) => q.where({ name: 'JOHN1' })))
    .toEqual(updatedUser)
})

it('supports a function as the next value of a nested key', async () => {
  const users = new Collection({
    schema: schema.extend({
      address: z.object({ city: z.string() }),
    }),
  })
  await users.create({ id: 1, name: 'John', address: { city: 'New York' } })

  const updatedUser = await users.update((q) => q.where({ name: 'John' }), {
    data(user) {
      user.address.city = user.address.city.toUpperCase()
    },
  })
  expect.soft(updatedUser, 'Returns the updated user').toEqual({
    id: 1,
    name: 'John',
    address: { city: 'NEW YORK' },
  })
  expect
    .soft(users.findFirst((q) => q.where({ address: { city: 'NEW YORK' } })))
    .toEqual(updatedUser)
})

it('supports deleting an item from an array as an update', async () => {
  const users = new Collection({
    schema: z.object({
      id: z.number(),
      numbers: z.array(z.number()),
    }),
  })
  await users.create({ id: 1, numbers: [1, 2, 3] })

  await expect(
    users.update((q) => q.where({ id: 1 }), {
      data(user) {
        user.numbers.splice(user.numbers.indexOf(2), 1)
      },
    }),
  ).resolves.toEqual({ id: 1, numbers: [1, 3] })

  expect(users.findFirst((q) => q.where({ id: 1 }))).toEqual({
    id: 1,
    numbers: [1, 3],
  })
})

it('supports adding an item to a one-to-many relation as an update', async () => {
  const postSchema = z.object({
    id: z.number(),
    get comments() {
      return z.array(commentSchema)
    },
  })
  const commentSchema = z.object({
    text: z.string(),
  })

  const posts = new Collection({ schema: postSchema })
  const comments = new Collection({ schema: commentSchema })

  posts.defineRelations(({ many }) => ({
    comments: many(comments),
  }))

  await posts.create({
    id: 1,
    comments: [
      await comments.create({ text: 'First!' }),
      await comments.create({ text: 'Thanks for watching.' }),
    ],
  })

  let newComment = await comments.create({ text: 'New and shiny!' });

  await expect(
    posts.update((q) => q.where({ id: 1 }), {
      data(post) {
        post.comments.push(newComment)
      },
    }),
  ).resolves.toEqual({ id: 1, comments: [{ text: 'First!' }, { text: 'Thanks for watching.' }, { text: 'New and shiny!' }] })

  expect(posts.findFirst((q) => q.where({ id: 1 }))).toEqual({
    id: 1,
    numbers: [{ text: 'First!' }, { text: 'Thanks for watching.' }, { text: 'New and shiny!' }],
  })
})

it('re-applies the schema on updates', async () => {
  const users = new Collection({
    schema: schema
      .extend({
        email: z.email().optional(),
      })
      .transform((user) => {
        user.email = `${user.name.toLowerCase()}@mail.com`
        return user
      }),
  })

  await users.create({ id: 1, name: 'John' })

  const updatedUser = await users.update((q) => q.where({ id: 1 }), {
    data(user) {
      user.name = 'Johnatan'
    },
  })

  expect(updatedUser).toEqual({
    id: 1,
    name: 'Johnatan',
    email: 'johnatan@mail.com',
  })
  expect(
    users.findFirst((q) => q.where({ email: 'johnatan@mail.com' })),
  ).toEqual(updatedUser)
})

it('updates a root-level array', async () => {
  const friends = new Collection({
    schema: z.array(z.object({ name: z.string() })),
  })

  const list = await friends.create([{ name: 'John' }, { name: 'Kate' }])

  await expect(
    friends.update(list, {
      data(friends) {
        friends.push({ name: 'Alice' })
      },
    }),
  ).resolves.toEqual([{ name: 'John' }, { name: 'Kate' }, { name: 'Alice' }])
  expect(friends.all()).toEqual([
    [{ name: 'John' }, { name: 'Kate' }, { name: 'Alice' }],
  ])

  await expect(
    friends.update(list, {
      data(friends) {
        friends.splice(1, 1)
      },
    }),
  ).resolves.toEqual([{ name: 'John' }, { name: 'Alice' }])
  expect(friends.all()).toEqual([[{ name: 'John' }, { name: 'Alice' }]])
})

it('updates a particular item in a nested array', async () => {
  const users = new Collection({
    schema: z.object({
      id: z.number(),
      numbers: z.array(z.number()),
    }),
  })
  const user = await users.create({ id: 1, numbers: [1, 2, 3] })

  await expect(
    users.update(user, {
      data(user) {
        user.numbers[1] = 500
      },
    }),
  ).resolves.toEqual({ id: 1, numbers: [1, 500, 3] })
})
