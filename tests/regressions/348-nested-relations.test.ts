import { Collection } from '#/src/collection.js'
import z from 'zod'

it('creates a record with a nested relation through another model', async () => {
  const contactSchema = z.object({ email: z.email() })
  const userSchema = z.object({ id: z.number(), contact: contactSchema })
  const postSchema = z.object({
    title: z.string(),
    author: userSchema,
  })

  const contacts = new Collection({ schema: contactSchema })
  const users = new Collection({ schema: userSchema })
  const posts = new Collection({ schema: postSchema })

  users.defineRelations(({ one }) => ({
    contact: one(contacts),
  }))
  posts.defineRelations(({ one }) => ({
    author: one(users),
  }))

  const contact = await contacts.create({ email: 'john@example.com' })
  expect(contact).toEqual({ email: 'john@example.com' })

  const user = await users.create({ id: 1, contact })
  expect(user).toEqual({ id: 1, contact: { email: 'john@example.com' } })

  /**
   * Creating a post introduces this relation chain:
   * post.author -> user.contact -> contact
   *
   * Due to our sanitization logic, `author.contact` will be reset to
   * the default value based on its relation (`undefined` here).
   */
  const post = await posts.create({ title: 'First', author: user })
  expect(post).toEqual({
    title: 'First',
    author: {
      id: 1,
      contact: { email: 'john@example.com' },
    },
  })
})
