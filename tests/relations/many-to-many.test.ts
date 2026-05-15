import { Collection } from '#/src/collection.js'
import { z } from 'zod'

const userSchema = z.object({
  id: z.number(),
  get posts() {
    return z.array(postSchema)
  },
})

const postSchema = z.object({
  title: z.string(),
  get authors() {
    return z.array(userSchema).optional()
  },
})

it('supports a many-to-many relation', async () => {
  const users = new Collection({ schema: userSchema })
  const posts = new Collection({ schema: postSchema })

  users.defineRelations(({ many }) => ({
    posts: many(posts),
  }))
  posts.defineRelations(({ many }) => ({
    authors: many(users),
  }))

  const firstPost = await posts.create({ title: 'First' })
  const secondPost = await posts.create({ title: 'Second' })

  const firstUser = await users.create({
    id: 1,
    posts: [firstPost, secondPost],
  })
  const secondUser = await users.create({
    id: 2,
    posts: [firstPost, secondPost],
  })

  expect(firstUser.posts).toEqual([
    { title: 'First', authors: [firstUser, secondUser] },
    { title: 'Second', authors: [firstUser, secondUser] },
  ])
  expect(secondUser.posts).toEqual([
    { title: 'First', authors: [firstUser, secondUser] },
    { title: 'Second', authors: [firstUser, secondUser] },
  ])
})

it('respects updates of foreign records', async () => {
  const users = new Collection({ schema: userSchema })
  const posts = new Collection({ schema: postSchema })

  users.defineRelations(({ many }) => ({
    posts: many(posts),
  }))
  posts.defineRelations(({ many }) => ({
    authors: many(users),
  }))

  const firstPost = await posts.create({ title: 'First' })
  const secondPost = await posts.create({ title: 'Second' })

  const firstUser = await users.create({
    id: 1,
    posts: [firstPost, secondPost],
  })
  const secondUser = await users.create({
    id: 2,
    posts: [firstPost, secondPost],
  })

  // Users reflect updates of posts.
  await posts.update((q) => q.where({ title: 'First' }), {
    data(post) {
      post.title = 'Updated'
    },
  })

  expect(firstUser.posts[0], 'Updates references to foreign records').toEqual({
    title: 'Updated',
    authors: [firstUser, secondUser],
  })
  expect(secondUser.posts[0], 'Updates references to foreign records').toEqual({
    title: 'Updated',
    authors: [firstUser, secondUser],
  })

  // Posts reflect updates of users.
  const updatedSecondUser = await users.update((q) => q.where({ id: 2 }), {
    data(user) {
      user.id = 20
    },
  })
  expect(firstPost.authors).toEqual([firstUser, updatedSecondUser])
  expect(secondPost.authors).toEqual([firstUser, updatedSecondUser])
})

it('scopes a nested many-to-many relation update to the targeted record', async () => {
  const users = new Collection({ schema: userSchema })
  const posts = new Collection({ schema: postSchema })

  users.defineRelations(({ many }) => ({
    posts: many(posts),
  }))
  posts.defineRelations(({ many }) => ({
    authors: many(users),
  }))

  const firstPost = await posts.create({ title: 'First' })
  const secondPost = await posts.create({ title: 'Second' })

  const firstUser = await users.create({ id: 1, posts: [firstPost] })
  await users.create({ id: 2, posts: [secondPost] })

  await users.update(firstUser, {
    data(user) {
      user.posts[0]!.title = 'Updated'
    },
  })

  expect(posts.all().map((post) => post.title)).toEqual(['Updated', 'Second'])
})

it('creates a self referencing many-to-many relation', async () => {
  const userSchema = z.object({
    id: z.number(),
    get children() {
      return z.array(userSchema).optional()
    },
    get parents() {
      return z.array(userSchema).optional()
    },
  })

  const users = new Collection({ schema: userSchema })

  users.defineRelations(({ many }) => ({
    children: many(users, { role: 'hierarchy' }),
    parents: many(users, { role: 'hierarchy' }),
  }))

  {
    const childOne = await users.create({
      id: 1,
    })

    const parentOne = await users.create({
      id: 2,
      children: [childOne],
    })

    expect
      .soft(parentOne.children)
      .toEqual([expect.objectContaining({ id: 1 })])
    expect.soft(parentOne.parents).toEqual([])

    expect.soft(childOne.children).toEqual([])
    expect.soft(childOne.parents).toEqual([expect.objectContaining({ id: 2 })])
  }

  {
    const parentTwo = await users.create({ id: 3 })
    const childTwo = await users.create({ id: 4, parents: [parentTwo] })

    expect
      .soft(parentTwo.children)
      .toEqual([expect.objectContaining({ id: 4 })])
    expect.soft(parentTwo.parents).toEqual([])

    expect.soft(childTwo.children).toEqual([])
    expect.soft(childTwo.parents).toEqual([expect.objectContaining({ id: 3 })])
  }
})
