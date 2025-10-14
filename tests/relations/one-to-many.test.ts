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

it('supports updating foreign records through the owner updates', async () => {
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
    comments: [await comments.create({ text: 'First' })],
  })

  await expect(
    posts.update((q) => q.where({ id: 1 }), {
      data(post) {
        post.comments[0]!.text = 'Updated'
      },
    }),
  ).resolves.toEqual({
    id: 1,
    comments: [{ text: 'Updated' }],
  })
  expect(comments.findFirst((q) => q.where({ text: 'Updated' }))).toEqual({
    id: 1,
    text: 'Updated',
  })
})

it('supports updating foreign relations through the owner updates', async () => {
  const postSchema = z.object({
    id: z.number(),
    get comments() {
      return z.array(commentSchema)
    },
  })
  const locationSchema = z.object({
    lat: z.string(),
  })
  const commentSchema = z.object({
    text: z.string(),
    location: locationSchema.optional(),
  })

  const posts = new Collection({ schema: postSchema })
  const comments = new Collection({ schema: commentSchema })
  const locations = new Collection({ schema: locationSchema })

  posts.defineRelations(({ many }) => ({
    comments: many(comments),
  }))
  comments.defineRelations(({ one }) => ({
    location: one(locations),
  }))

  await posts.create({
    id: 1,
    comments: [
      await comments.create({
        text: 'First',
        location: await locations.create({
          lat: '40.7128° N',
        }),
      }),
    ],
  })

  await expect(
    posts.update((q) => q.where({ id: 1 }), {
      async data(post) {
        post.comments[0]!.location = await locations.create({
          lat: '40.7128° N',
        })
      },
    }),
    'Replaces the foreign relation',
  ).resolves.toEqual({
    id: 1,
    comments: [{ text: 'First', location: { lat: '40.7128° N' } }],
  })
  expect(
    comments.findFirst((q) => q.where({ location: { lat: '40.7128° N' } })),
  ).toEqual({
    text: 'First',
    location: { lat: '40.7128° N' },
  })

  await expect
    .soft(
      posts.update((q) => q.where({ id: 1 }), {
        data(post) {
          post.comments[0]!.location!.lat = '10.0001° N'
        },
      }),
      'Updates the nested foreign record',
    )
    .resolves.toEqual({
      id: 1,
      comments: [{ text: 'First', location: { lat: '10.0001° N' } }],
    })
  expect
    .soft(locations.findFirst((q) => q.where({ lat: '10.0001° N' })))
    .toEqual({
      lat: '10.0001° N',
    })
})

it('supports updating one-to-many relations by pushing new records to the relational array', async () => {
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
    comments: [await comments.create({ text: 'First' })],
  })

  const newComment = await comments.create({ text: 'Third' })

  await expect(
    posts.update((q) => q.where({ id: 1 }), {
      data(post) {
        post.comments.push(newComment)
      },
    }),
  ).resolves.toEqual({
    id: 1,
    comments: [{ text: 'First' }, { text: 'Second' }],
  })
  expect(posts.findFirst((q) => q.where({ id: 1 }))).toEqual({
    id: 1,
    numbers: [{ text: 'First!' }, { text: 'Second!' }],
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

it('cascades foreign record deletion when clearing the entire collection', async () => {
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

  users.clear()

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
