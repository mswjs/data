import { Collection } from '#/src/index.js'
import z from 'zod'

const userSchema = z.object({
  id: z.number(),
})

const postSchema = z.object({
  title: z.string(),
  get author() {
    return z.lazy(() => userSchema)
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
