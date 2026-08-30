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

test('passes hydrated records through the schema', async ({ serve, page }) => {
  const { url, evaluate } = await serve(async () => {
    const z = await import('zod')
    const { Collection } = await import('#/src/collection.js')
    const { persist } = await import('#/src/extensions/persist.js')

    const schema = z.object({
      id: z.number(),
      createdAt: z.coerce.date(),
    })

    const users = new Collection({ schema, extensions: [persist()] })
    return { users }
  })

  await page.goto(url.href, { waitUntil: 'networkidle' })

  await evaluate(async ({ users }) => {
    await users.create({ id: 1, createdAt: '2024-01-01T00:00:00.000Z' })
  })

  await page.reload({ waitUntil: 'networkidle' })

  await expect(
    evaluate(({ users }) => {
      const user = users.findFirst((q) => q.where({ id: 1 }))
      return {
        isDate: user?.createdAt instanceof Date,
        createdAt: user?.createdAt.toISOString(),
      }
    }),
    'Coerces the persisted string into a Date instance',
  ).resolves.toEqual({
    isDate: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  })
})

test('persists a required relation', async ({ serve, page }) => {
  const { url, evaluate } = await serve(async () => {
    const z = await import('zod')
    const { Collection } = await import('#/src/collection.js')
    const { persist } = await import('#/src/extensions/persist.js')

    const userSchema = z.object({
      id: z.number(),
      createdAt: z.coerce.date(),
    })
    const wishlistSchema = z.object({
      id: z.number(),
      get user() {
        return userSchema
      },
    })

    const users = new Collection({
      schema: userSchema,
      extensions: [persist()],
    })
    const wishlists = new Collection({
      schema: wishlistSchema,
      extensions: [persist()],
    })

    wishlists.defineRelations(({ one }) => ({
      user: one(users),
    }))

    return { users, wishlists }
  })

  await page.goto(url.href, { waitUntil: 'networkidle' })

  await evaluate(async ({ users, wishlists }) => {
    const user = await users.create({
      id: 1,
      createdAt: '2024-01-01T00:00:00.000Z',
    })
    await wishlists.create({ id: 1, user })
  })

  await page.reload({ waitUntil: 'networkidle' })

  await expect(
    evaluate(({ wishlists }) => {
      const wishlist = wishlists.findFirst((q) => q.where({ id: 1 }))
      return {
        id: wishlist?.id,
        userId: wishlist?.user.id,
        isUserCreatedAtDate: wishlist?.user.createdAt instanceof Date,
      }
    }),
    'Restores the required relation and passes the foreign record through its schema',
  ).resolves.toEqual({
    id: 1,
    userId: 1,
    isUserCreatedAtDate: true,
  })
})

test('persists a unique relation', async ({ serve, page }) => {
  const { url, evaluate } = await serve(async () => {
    const z = await import('zod')
    const { Collection } = await import('#/src/collection.js')
    const { persist } = await import('#/src/extensions/persist.js')

    const userSchema = z.object({
      id: z.number(),
    })
    const wishlistSchema = z.object({
      id: z.number(),
      get user() {
        return userSchema
      },
    })

    const users = new Collection({
      schema: userSchema,
      extensions: [persist()],
    })
    const wishlists = new Collection({
      schema: wishlistSchema,
      extensions: [persist()],
    })

    wishlists.defineRelations(({ one }) => ({
      user: one(users, { unique: true }),
    }))

    return { users, wishlists }
  })

  await page.goto(url.href, { waitUntil: 'networkidle' })

  await evaluate(async ({ users, wishlists }) => {
    const user = await users.create({ id: 1 })
    await wishlists.create({ id: 1, user })
  })

  await page.reload({ waitUntil: 'networkidle' })

  await expect(
    evaluate(({ wishlists }) => {
      return wishlists.all()
    }),
  ).resolves.toEqual([{ id: 1, user: { id: 1 } }])
})

test('does not duplicate hydrated records in other tabs when combined with `sync`', async ({
  context,
  serve,
  page,
}) => {
  const { url, evaluate } = await serve(async () => {
    const z = await import('zod')
    const { Collection } = await import('#/src/collection.js')
    const { persist } = await import('#/src/extensions/persist.js')
    const { sync } = await import('#/src/extensions/sync.js')

    const schema = z.object({
      id: z.number(),
      name: z.string(),
    })

    const users = new Collection({
      schema,
      extensions: [sync(), persist()],
    })

    return { users }
  })

  await page.goto(url.href, { waitUntil: 'networkidle' })
  const secondPage = await context.newPage()
  await secondPage.goto(url.href, { waitUntil: 'networkidle' })

  await evaluate(async ({ users }) => {
    await users.create({ id: 1, name: 'John' })
  })

  await expect(
    evaluate(({ users }) => users.all(), { page: secondPage }),
    'Synchronizes the record with another tab',
  ).resolves.toEqual([{ id: 1, name: 'John' }])

  // Reloading hydrates the record from the storage.
  await page.reload({ waitUntil: 'networkidle' })

  await expect(
    evaluate(({ users }) => users.all()),
    'Hydrates the record once',
  ).resolves.toEqual([{ id: 1, name: 'John' }])

  await expect(
    evaluate(({ users }) => users.all(), { page: secondPage }),
    'Does not broadcast the hydrated record to other tabs',
  ).resolves.toEqual([{ id: 1, name: 'John' }])
})

test('hydrates the collection synchronously', async ({ serve, page }) => {
  const { url, evaluate } = await serve(async () => {
    const z = await import('zod')
    const { Collection } = await import('#/src/collection.js')
    const { persist } = await import('#/src/extensions/persist.js')

    const schema = z.object({
      id: z.number(),
    })

    const users = new Collection({ schema, extensions: [persist()] })

    // Query the collection immediately after its construction.
    const recordsAfterConstruction = users.all().length

    return { users, recordsAfterConstruction }
  })

  await page.goto(url.href, { waitUntil: 'networkidle' })

  await evaluate(async ({ users }) => {
    await users.create({ id: 1 })
  })

  await page.reload({ waitUntil: 'networkidle' })

  await expect(
    evaluate(({ recordsAfterConstruction }) => recordsAfterConstruction),
    'Hydrated records are available synchronously after construction',
  ).resolves.toBe(1)
})

test('throws when hydrating with an asynchronous schema', async ({
  serve,
  page,
}) => {
  const { url, evaluate } = await serve(async () => {
    const z = await import('zod')
    const { Collection } = await import('#/src/collection.js')
    const { persist } = await import('#/src/extensions/persist.js')

    const schema = z.object({
      id: z.number().refine(async () => true),
    })

    try {
      const users = new Collection({ schema, extensions: [persist()] })
      return { users, error: undefined }
    } catch (error) {
      return { users: undefined, error: String(error) }
    }
  })

  await page.goto(url.href, { waitUntil: 'networkidle' })

  await evaluate(async ({ users }) => {
    await users?.create({ id: 1 })
  })

  await page.reload({ waitUntil: 'networkidle' })

  await expect(
    evaluate(({ error }) => error),
    'Fails the collection construction with a descriptive error',
  ).resolves.toMatch(/asynchronous/)
})
