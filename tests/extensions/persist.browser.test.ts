import { waitForDebugger } from 'inspector'
import { test, expect } from 'playwright.extend.js'

test('persists records across page reloads', async ({ serve, page }) => {
  const { url, evaluate } = await serve(async () => {
    const z = await import('zod')
    const { Collection } = await import('#/src/collection.js')
    const { persist } = await import('#/src/extensions/persist.js')

    const schema = z.object({
      id: z.number(),
      name: z.string(),
    })

    const users = new Collection({ schema, extensions: [persist()] })
    return { users }
  })

  await page.goto(url.href, { waitUntil: 'networkidle' })

  await evaluate(async ({ users }) => {
    await users.create({ id: 1, name: 'John' })
  })

  await page.reload({ waitUntil: 'networkidle' })

  await expect(
    evaluate(({ users }) => {
      return users.all()
    }),
    'Persist the record across page reloads',
  ).resolves.toEqual([{ id: 1, name: 'John' }])

  await evaluate(async ({ users }) => {
    await users.create({ id: 2, name: 'Kate' })
  })

  await page.reload({ waitUntil: 'networkidle' })

  await expect(
    evaluate(({ users }) => {
      return users.all()
    }),
    'Accumulates records',
  ).resolves.toEqual([
    { id: 1, name: 'John' },
    { id: 2, name: 'Kate' },
  ])
})

test('persists relations defined on runtime', async ({ serve, page }) => {
  const { url, evaluate } = await serve(async () => {
    const z = await import('zod')
    const { Collection } = await import('#/src/collection.js')
    const { persist } = await import('#/src/extensions/persist.js')

    const userSchema = z.object({
      id: z.number(),
      get posts() {
        return z.array(postSchema).optional().default([])
      },
    })
    const postSchema = z.object({
      title: z.string(),
      get author() {
        return userSchema.optional()
      },
    })

    const users = new Collection({
      schema: userSchema,
      extensions: [persist()],
    })
    const posts = new Collection({
      schema: postSchema,
      extensions: [persist()],
    })

    users.defineRelations(({ many }) => ({
      posts: many(posts),
    }))
    posts.defineRelations(({ one }) => ({
      author: one(users),
    }))

    return { users, posts }
  })

  await page.goto(url.href, { waitUntil: 'networkidle' })

  await evaluate(async ({ users, posts }) => {
    await users.create({
      id: 1,
      posts: [
        await posts.create({ title: 'First' }),
        await posts.create({ title: 'Second' }),
      ],
    })
  })

  await page.reload({ waitUntil: 'networkidle' })

  await expect(
    evaluate(({ users }) => {
      const user = users.findFirst((q) => q.where({ id: 1 }))
      return user?.posts
    }),
  ).resolves.toEqual([
    { title: 'First', author: expect.objectContaining({ id: 1 }) },
    { title: 'Second', author: expect.objectContaining({ id: 1 }) },
  ])

  await expect(
    evaluate(({ posts }) => {
      const post = posts.findFirst((q) => q.where({ title: 'First' }))
      return post?.author
    }),
  ).resolves.toEqual({
    id: 1,
    posts: [
      expect.objectContaining({
        title: 'First',
        author: expect.objectContaining({ id: 1 }),
      }),
      expect.objectContaining({
        title: 'Second',
        author: expect.objectContaining({ id: 1 }),
      }),
    ],
  })
})

test('persists relations defined in user code', async ({ serve, page }) => {
  const { url, evaluate } = await serve(async () => {
    const z = await import('zod')
    const { Collection } = await import('#/src/collection.js')
    const { persist } = await import('#/src/extensions/persist.js')

    const userSchema = z.object({
      id: z.number(),
      get posts() {
        return z.array(postSchema).optional().default([])
      },
    })
    const postSchema = z.object({
      title: z.string(),
      get author() {
        return userSchema.optional()
      },
    })

    const users = new Collection({
      schema: userSchema,
      extensions: [persist()],
    })
    const posts = new Collection({
      schema: postSchema,
      extensions: [persist()],
    })

    users.defineRelations(({ many }) => ({
      posts: many(posts),
    }))
    posts.defineRelations(({ one }) => ({
      author: one(users),
    }))

    await users.create({
      id: 1,
      posts: [
        await posts.create({ title: 'First' }),
        await posts.create({ title: 'Second' }),
      ],
    })

    return { users, posts }
  })

  await page.goto(url.href, { waitUntil: 'networkidle' })

  await expect(
    evaluate(({ users }) => {
      const user = users.findFirst((q) => q.where({ id: 1 }))
      return user?.posts
    }),
  ).resolves.toEqual([
    { title: 'First', author: expect.objectContaining({ id: 1 }) },
    { title: 'Second', author: expect.objectContaining({ id: 1 }) },
  ])

  await page.reload({ waitUntil: 'networkidle' })

  await expect(
    evaluate(({ users }) => {
      const user = users.findFirst((q) => q.where({ id: 1 }))
      return user?.posts
    }),
  ).resolves.toEqual([
    { title: 'First', author: expect.objectContaining({ id: 1 }) },
    { title: 'Second', author: expect.objectContaining({ id: 1 }) },
  ])
})

test('works in combination with `sync`', async ({ context, serve, page }) => {
  const { url, evaluate } = await serve(async () => {
    const z = await import('zod')
    const { Collection } = await import('#/src/collection.js')
    const { persist } = await import('#/src/extensions/persist.js')
    const { sync } = await import('#/src/extensions/sync.js')

    const userSchema = z.object({
      id: z.number(),
      get posts() {
        return z.array(postSchema).optional().default([])
      },
    })
    const postSchema = z.object({
      title: z.string(),
      get author() {
        return userSchema.optional()
      },
    })

    const users = new Collection({
      schema: userSchema,
      extensions: [sync(), persist()],
    })
    const posts = new Collection({
      schema: postSchema,
      extensions: [sync(), persist()],
    })

    users.defineRelations(({ many }) => ({
      posts: many(posts),
    }))
    posts.defineRelations(({ one }) => ({
      author: one(users),
    }))

    return { users, posts }
  })

  await page.goto(url.href, { waitUntil: 'networkidle' })

  const secondPage = await context.newPage()
  await secondPage.goto(url.href, { waitUntil: 'networkidle' })

  // Create records on one page.
  await evaluate(
    async ({ users, posts }) => {
      await users.create({
        id: 1,
        posts: [
          await posts.create({ title: 'First' }),
          await posts.create({ title: 'Second' }),
        ],
      })
    },
    { page: secondPage },
  )

  await expect(
    evaluate(({ users }) => {
      return users.findFirst((q) => q.where({ id: 1 }))
    }),
    'Synchronizes records with another page',
  ).resolves.toEqual({
    id: 1,
    posts: [
      expect.objectContaining({
        title: 'First',
        author: expect.objectContaining({ id: 1 }),
      }),
      expect.objectContaining({
        title: 'Second',
        author: expect.objectContaining({ id: 1 }),
      }),
    ],
  })

  await page.bringToFront()
  await page.reload({ waitUntil: 'networkidle' })

  await page.pause()

  await expect(
    evaluate(({ users }) => {
      return users.findFirst((q) => q.where({ id: 1 }))
    }),
    'Records survive reload',
  ).resolves.toEqual({
    id: 1,
    posts: [
      expect.objectContaining({
        title: 'First',
        author: expect.objectContaining({ id: 1 }),
      }),
      expect.objectContaining({
        title: 'Second',
        author: expect.objectContaining({ id: 1 }),
      }),
    ],
  })
})
