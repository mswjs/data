import { Collection } from '#/src/index.js'
import z from 'zod'

const userSchema = z.object({
  id: z.number(),
  get posts() {
    return z.array(postSchema)
  },
})

const postSchema = z.object({
  title: z.string(),
  get author() {
    return userSchema.optional()
  },
})

it('supports a one-to-many relation', async () => {
  const users = new Collection({ schema: userSchema })
  const posts = new Collection({ schema: postSchema })

  users.defineRelations(({ many }) => ({
    posts: many(posts),
  }))

  const firstUser = await users.create({
    id: 1,
    posts: [await posts.create({ title: 'First' })],
  })
  const secondUser = await users.create({
    id: 2,
    posts: [await posts.create({ title: 'Second' })],
  })

  expect.soft(firstUser.posts[0]).toEqual({ title: 'First' })
  expect(secondUser.posts[0]).toEqual({ title: 'Second' })

  expect
    .soft(users.findFirst((q) => q.where({ posts: { title: 'First' } })))
    .toEqual({
      id: 1,
      posts: [{ title: 'First' }],
    })
  expect
    .soft(users.findFirst((q) => q.where({ posts: { title: 'Second' } })))
    .toEqual({
      id: 2,
      posts: [{ title: 'Second' }],
    })
})

it('supports a two-way one-to-many relation', async () => {
  const users = new Collection({ schema: userSchema })
  const posts = new Collection({ schema: postSchema })

  users.defineRelations(({ many }) => ({
    posts: many(posts),
  }))
  posts.defineRelations(({ one }) => ({
    author: one(users),
  }))

  {
    const post = await posts.create({ title: 'First' })
    const user = await users.create({
      id: 1,
      posts: [post],
    })

    expect(post.author).toEqual(user)
    expect(posts.findFirst((q) => q.where({ title: 'First' }))).toMatchObject({
      title: 'First',
      author: { id: 1, posts: expect.any(Array) },
    })
  }

  users.clear()
  posts.clear()

  {
    const user = await users.create({ id: 1, posts: [] })
    const post = await posts.create({ title: 'First', author: user })

    expect(user.posts).toEqual([post])
    expect(users.findFirst((q) => q.where({ id: 1 }))).toMatchObject({
      id: 1,
      posts: [{ title: 'First', author: expect.any(Object) }],
    })
  }
})

it('differentiates between ambiguous relations', async () => {
  const userSchema = z.object({
    id: z.number(),
    get posts() {
      return z.array(postSchema).optional()
    },
    get reviews() {
      return z.array(postSchema).optional()
    },
  })

  const postSchema = z.object({
    title: z.string(),
    get author() {
      return userSchema.optional()
    },
    get reviewer() {
      return userSchema.optional()
    },
  })

  const users = new Collection({ schema: userSchema })
  const posts = new Collection({ schema: postSchema })

  users.defineRelations(({ many }) => ({
    posts: many(posts, { role: 'author' }),
    reviews: many(posts, { role: 'reviewer' }),
  }))
  posts.defineRelations(({ one }) => ({
    author: one(users, { role: 'author' }),
    reviewer: one(users, { role: 'reviewer' }),
  }))

  const post = await posts.create({ title: 'First' })

  const firstUser = await users.create({
    id: 1,
    posts: [post],
    reviews: [],
  })
  const secondUser = await users.create({
    id: 2,
    posts: [],
    reviews: [post],
  })

  expect
    .soft(firstUser.posts)
    .toEqual([expect.objectContaining({ title: 'First' })])
  expect.soft(firstUser.reviews).toEqual([])

  expect.soft(secondUser.posts).toEqual([])
  expect
    .soft(secondUser.reviews)
    .toEqual([expect.objectContaining({ title: 'First' })])
})

it('updates an inverse relation when the referenced record is created', async () => {
  const users = new Collection({ schema: userSchema })
  const posts = new Collection({ schema: postSchema })

  users.defineRelations(({ many }) => ({
    posts: many(posts),
  }))
  posts.defineRelations(({ one }) => ({
    author: one(users),
  }))

  const user = await users.create({
    id: 1,
    posts: [await posts.create({ title: 'First' })],
  })
  await posts.create({ title: 'Second', author: user })

  expect(users.findFirst((q) => q.where({ id: 1 }))).toEqual({
    id: 1,
    posts: [
      { title: 'First', author: user },
      { title: 'Second', author: user },
    ],
  })
})

it('updates a one-to-many relation when the referenced record is updated', async () => {
  const users = new Collection({ schema: userSchema })
  const posts = new Collection({ schema: postSchema })

  users.defineRelations(({ many }) => ({
    posts: many(posts),
  }))
  posts.defineRelations(({ one }) => ({
    author: one(users),
  }))

  const user = await users.create({
    id: 1,
    posts: [await posts.create({ title: 'First' })],
  })

  await posts.update((q) => q.where({ title: 'First' }), {
    data(post) {
      post.title = 'Updated'
    },
  })

  expect(users.findFirst((q) => q.where({ id: 1 }))).toEqual({
    id: 1,
    posts: [{ title: 'Updated', author: user }],
  })
})

it('updates a one-to-many relation when the referenced record is dissociated', async () => {
  const users = new Collection({ schema: userSchema })
  const posts = new Collection({ schema: postSchema })

  users.defineRelations(({ many }) => ({
    posts: many(posts),
  }))
  posts.defineRelations(({ one }) => ({
    author: one(users),
  }))

  await users.create({
    id: 1,
    posts: [await posts.create({ title: 'First' })],
  })

  // Set a new author for the post.
  const updatedPost = await posts.update((q) => q.where({ title: 'First' }), {
    async data(post) {
      post.author = await users.create({ id: 2, posts: [] })
    },
  })

  expect(updatedPost, 'Returns updated record').toEqual({
    title: 'First',
    author: { id: 2, posts: [updatedPost] },
  })

  expect(
    posts.findFirst((q) => q.where({ title: 'First' })),
    'Updates the owner record',
  ).toEqual({
    title: 'First',
    author: { id: 2, posts: [updatedPost] },
  })

  expect(
    users.findFirst((q) => q.where({ id: 1 })),
    'Updates the foreign record',
  ).toEqual({
    id: 1,
    posts: [],
  })
})

it('supports nullable one-to-many relations', async () => {
  const users = new Collection({
    schema: z.object({
      id: z.number(),
      posts: postSchema.nullable(),
    }),
  })
  const posts = new Collection({ schema: postSchema })

  users.defineRelations(({ many }) => ({
    posts: many(posts),
  }))

  const user = await users.create({
    id: 1,
    posts: null,
  })

  expect.soft(user.posts).toBeNull()
  expect.soft(users.findFirst((q) => q.where({ posts: null }))).toEqual(user)
})

it('updates the relation when the owner record is deleted', async () => {
  const users = new Collection({ schema: userSchema })
  const posts = new Collection({ schema: postSchema })

  users.defineRelations(({ many }) => ({
    posts: many(posts),
  }))
  posts.defineRelations(({ one }) => ({
    author: one(users),
  }))

  // Deleting the post, user updates.
  {
    const post = await posts.create({ title: 'First' })
    const user = await users.create({
      id: 1,
      posts: [post],
    })

    posts.delete((q) => q.where({ title: 'First' }))

    expect.soft(user.posts).toEqual([])
    expect.soft(posts.all()).toEqual([])
    expect
      .soft(posts.findFirst((q) => q.where({ title: 'First' })))
      .toBeUndefined()
  }

  users.clear()
  posts.clear()

  // Deleting the user, post updates.
  {
    const post = await posts.create({ title: 'First' })
    const user = await users.create({
      id: 1,
      posts: [post],
    })

    users.delete(user)

    expect.soft(post.author).toBeUndefined()
    expect
      .soft(posts.findFirst((q) => q.where({ title: 'First' })))
      .toEqual({ title: 'First', author: undefined })
  }
})

it('cascades foreign record deletion when the owner record is deleted', async () => {
  const users = new Collection({ schema: userSchema })
  const posts = new Collection({ schema: postSchema })

  users.defineRelations(({ many }) => ({
    posts: many(posts),
  }))
  posts.defineRelations(({ one }) => ({
    // When the referenced author is deleted, delete all their posts.
    author: one(users, { onDelete: 'cascade' }),
  }))

  const post = await posts.create({ title: 'First' })
  const user = await users.create({
    id: 1,
    posts: [post],
  })

  users.delete(user)

  expect(posts.all()).toEqual([])
  expect(users.all()).toEqual([])
})

it('supports unique one-to-many relations', async () => {
  const users = new Collection({ schema: userSchema })
  const posts = new Collection({ schema: postSchema })

  users.defineRelations(({ many }) => ({
    posts: many(posts, { unique: true }),
  }))
  posts.defineRelations(({ one }) => ({
    author: one(users),
  }))

  const post = await posts.create({ title: 'First' })
  const user = await users.create({ id: 1, posts: [post] })

  expect.soft(user).toEqual({
    id: 1,
    posts: [post],
  })
  expect.soft(post.author).toEqual(user)
  expect
    .soft(users.findFirst((q) => q.where({ posts: { title: post.title } })))
    .toEqual(user)
  expect
    .soft(posts.findFirst((q) => q.where({ author: { id: user.id } })))
    .toEqual(post)

  const updatedPost = await posts.update(post, {
    data(post) {
      post.title = 'Updated'
    },
  })

  expect.soft(user).toEqual({
    id: 1,
    posts: [updatedPost],
  })
  expect.soft(post.author).toEqual(user)
  expect
    .soft(
      users.findFirst((q) => q.where({ posts: { title: updatedPost!.title } })),
    )
    .toEqual(user)
  expect
    .soft(posts.findFirst((q) => q.where({ author: { id: user.id } })))
    .toEqual(updatedPost)
})

it('errors when creating a unique relation with already associated foreign records', async () => {
  // Create a user with an already associated post.
  {
    const users = new Collection({ schema: userSchema })
    const posts = new Collection({ schema: postSchema })

    users.defineRelations(({ many }) => ({
      posts: many(posts, { unique: true }),
    }))
    posts.defineRelations(({ one }) => ({
      author: one(users),
    }))

    const post = await posts.create({ title: 'First' })
    await users.create({ id: 1, posts: [post] })

    await expect(users.create({ id: 2, posts: [post] })).rejects.toThrow(
      'Failed to create a unique relation at "posts": the foreign record is already associated with another owner',
    )
  }

  // Create a post with an already associated user.
  {
    const users = new Collection({ schema: userSchema })
    const posts = new Collection({ schema: postSchema })

    users.defineRelations(({ many }) => ({
      posts: many(posts),
    }))
    posts.defineRelations(({ one }) => ({
      author: one(users, { unique: true }),
    }))

    const user = await users.create({ id: 1, posts: [] })
    await posts.create({ title: 'First', author: user })

    await expect(
      posts.create({ title: 'Second', author: user }),
    ).rejects.toThrow(
      'Failed to create a unique relation at "author": the foreign record is already associated with another owner',
    )
  }
})
