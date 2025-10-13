import { Collection } from '#/src/collection.js'
import z from 'zod'

const userSchema = z.object({
  id: z.number(),
  get posts() {
    return z.lazy(() =>  z.array(postSchema))
  },
})

const postSchema = z.object({
  title: z.string(),
  get authors() {
    return z.lazy(() =>  z.array(userSchema))
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

  const firstPost = await posts.create({ title: 'First', authors: [] })
  const secondPost = await posts.create({ title: 'Second', authors: [] })

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

  const firstPost = await posts.create({ title: 'First', authors: [] })
  const secondPost = await posts.create({ title: 'Second', authors: [] })

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
