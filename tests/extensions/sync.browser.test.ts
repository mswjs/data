import { test, expect } from 'playwright.extend.js'

test('syncs record creation across tabs', async ({ serve, context, page }) => {
  const { url, evaluate } = await serve(async () => {
    const z = await import('zod')
    const { Collection } = await import('#/src/collection.js')
    const { sync } = await import('#/src/extensions/sync.js')

    const schema = z.object({
      id: z.number(),
      name: z.string(),
    })

    const users = new Collection({ schema, extensions: [sync()] })
    return { users }
  })

  await page.goto(url.href)
  const secondPage = await context.newPage()
  await secondPage.goto(url.href, { waitUntil: 'networkidle' })

  await expect(
    evaluate(async ({ users }) => {
      return await users.create({ id: 1, name: 'John' })
    }),
  ).resolves.toEqual({ id: 1, name: 'John' })

  await expect(
    evaluate(
      async ({ users }) => {
        return users.all()
      },
      { page: secondPage },
    ),
  ).resolves.toEqual([
    {
      id: 1,
      name: 'John',
    },
  ])
})

test('syncs record updates across tabs', async ({ serve, context, page }) => {
  const { url, evaluate } = await serve(async () => {
    const z = await import('zod')
    const { Collection } = await import('#/src/collection.js')
    const { sync } = await import('#/src/extensions/sync.js')

    const schema = z.object({
      id: z.number(),
      name: z.string(),
    })

    const users = new Collection({ schema, extensions: [sync()] })
    return { users }
  })

  await page.goto(url.href)
  const secondPage = await context.newPage()
  await secondPage.goto(url.href, { waitUntil: 'networkidle' })

  await expect(
    evaluate(async ({ users }) => {
      return await users.create({ id: 1, name: 'John' })
    }),
  ).resolves.toEqual({ id: 1, name: 'John' })

  await expect(
    evaluate(
      async ({ users }) => {
        return await users.update((q) => q.where({ id: 1 }), {
          data(user) {
            user.name = 'Johnatan'
          },
        })
      },
      { page: secondPage },
    ),
  ).resolves.toEqual({ id: 1, name: 'Johnatan' })

  await expect(
    evaluate(async ({ users }) => {
      return users.all()
    }),
    'Propagates the update to extraneous tab',
  ).resolves.toEqual([{ id: 1, name: 'Johnatan' }])
})

test('syncs updates that use functions to derive next values', async ({
  context,
  serve,
  page,
}) => {
  const { url, evaluate } = await serve(async () => {
    const z = await import('zod')
    const { Collection } = await import('#/src/collection.js')
    const { sync } = await import('#/src/extensions/sync.js')

    const schema = z.object({
      id: z.number(),
      name: z.string(),
    })

    const users = new Collection({ schema, extensions: [sync()] })
    return { users }
  })

  await page.goto(url.href)
  const secondPage = await context.newPage()
  await secondPage.goto(url.href, { waitUntil: 'networkidle' })

  await expect(
    evaluate(async ({ users }) => {
      return await users.create({ id: 1, name: 'John' })
    }),
  ).resolves.toEqual({ id: 1, name: 'John' })

  await expect(
    evaluate(
      async ({ users }) => {
        return await users.update((q) => q.where({ id: 1 }), {
          data(user) {
            user.name = user.name.toUpperCase()
          },
        })
      },
      { page: secondPage },
    ),
  ).resolves.toEqual({ id: 1, name: 'JOHN' })

  await expect(
    evaluate(async ({ users }) => {
      return users.all()
    }),
    'Propagates the update to extraneous tab',
  ).resolves.toEqual([{ id: 1, name: 'JOHN' }])
})

test('syncs updates that use a root-level `data` function', async ({
  context,
  serve,
  page,
}) => {
  const { url, evaluate } = await serve(async () => {
    const z = await import('zod')
    const { Collection } = await import('#/src/collection.js')
    const { sync } = await import('#/src/extensions/sync.js')

    const schema = z.object({
      id: z.number(),
      name: z.string(),
    })

    const users = new Collection({ schema, extensions: [sync()] })
    return { users }
  })

  await page.goto(url.href)
  const secondPage = await context.newPage()
  await secondPage.goto(url.href, { waitUntil: 'networkidle' })

  await expect(
    evaluate(async ({ users }) => {
      return await users.create({ id: 1, name: 'John' })
    }),
  ).resolves.toEqual({ id: 1, name: 'John' })

  await expect(
    evaluate(
      async ({ users }) => {
        return await users.update((q) => q.where({ id: 1 }), {
          data(user) {
            user.name = `${user.name.toUpperCase()}${user.id}`
          },
        })
      },
      { page: secondPage },
    ),
  ).resolves.toEqual({ id: 1, name: 'JOHN1' })

  await expect(
    evaluate(async ({ users }) => {
      return users.all()
    }),
    'Propagates the update to extraneous tab',
  ).resolves.toEqual([{ id: 1, name: 'JOHN1' }])
})

test('syncs record deletion across tabs', async ({ serve, context, page }) => {
  const { url, evaluate } = await serve(async () => {
    const z = await import('zod')
    const { Collection } = await import('#/src/collection.js')
    const { sync } = await import('#/src/extensions/sync.js')

    const schema = z.object({
      id: z.number(),
      name: z.string(),
    })

    const users = new Collection({ schema, extensions: [sync()] })
    return { users }
  })

  await page.goto(url.href)
  const secondPage = await context.newPage()
  await secondPage.goto(url.href, { waitUntil: 'networkidle' })

  await expect(
    evaluate(async ({ users }) => {
      return await users.create({ id: 1, name: 'John' })
    }),
  ).resolves.toEqual({ id: 1, name: 'John' })

  await expect(
    evaluate(
      async ({ users }) => {
        return users.delete((q) => q.where({ id: 1 }))
      },
      { page: secondPage },
    ),
  ).resolves.toEqual({ id: 1, name: 'John' })

  await expect(
    evaluate(async ({ users }) => {
      return users.all()
    }),
  ).resolves.toEqual([])
})

test('syncs a required relation across tabs', async ({
  serve,
  context,
  page,
}) => {
  const { url, evaluate } = await serve(async () => {
    const z = await import('zod')
    const { Collection } = await import('#/src/collection.js')
    const { sync } = await import('#/src/extensions/sync.js')

    const userSchema = z.object({
      id: z.number(),
    })
    const wishlistSchema = z.object({
      id: z.number(),
      get user() {
        return userSchema
      },
    })

    const users = new Collection({ schema: userSchema, extensions: [sync()] })
    const wishlists = new Collection({
      schema: wishlistSchema,
      extensions: [sync()],
    })

    wishlists.defineRelations(({ one }) => ({
      user: one(users),
    }))

    return { users, wishlists }
  })

  await page.goto(url.href, { waitUntil: 'networkidle' })
  const secondPage = await context.newPage()
  await secondPage.goto(url.href, { waitUntil: 'networkidle' })

  await evaluate(async ({ users, wishlists }) => {
    const user = await users.create({ id: 1 })
    await wishlists.create({ id: 1, user })
  })

  await expect(
    evaluate(
      ({ wishlists }) => {
        return wishlists.all()
      },
      { page: secondPage },
    ),
  ).resolves.toEqual([{ id: 1, user: { id: 1 } }])
})
