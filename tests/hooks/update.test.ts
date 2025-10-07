import { Collection } from '#/src/collection.js'
import type { HookEventListener } from '#/src/hooks.js'
import { isRecord } from '#/src/utils.js'
import z from 'zod'

it('invokes the update hook for a root property update', async () => {
  const users = new Collection({
    schema: z.object({
      id: z.number(),
    }),
  })

  const hook = vi.fn()
  users.hooks.on('update', hook)

  const user = await users.create({ id: 1 })
  await users.update(user, {
    data(user) {
      user.id = 123
    },
  })

  expect.soft(hook).toHaveBeenCalledTimes(1)
  expect.soft(hook).toHaveBeenCalledWith(
    expect.objectContaining({
      data: {
        prevRecord: { id: 1 },
        nextRecord: { id: 123 },
        path: ['id'],
        prevValue: 1,
        nextValue: 123,
      },
    }),
  )
})

it('invokes the update hook for a nested property update', async () => {
  const users = new Collection({
    schema: z.object({
      billing: z.object({
        address: z.object({
          street: z.string(),
        }),
      }),
    }),
  })

  const hook = vi.fn()
  users.hooks.on('update', hook)

  const user = await users.create({ billing: { address: { street: 'Baker' } } })
  await users.update(user, {
    data(user) {
      user.billing.address.street = 'Sunwell'
    },
  })

  expect.soft(hook).toHaveBeenCalledTimes(1)
  expect.soft(hook).toHaveBeenCalledWith(
    expect.objectContaining({
      data: {
        prevRecord: { billing: { address: { street: 'Baker' } } },
        nextRecord: { billing: { address: { street: 'Sunwell' } } },
        path: ['billing', 'address', 'street'],
        prevValue: 'Baker',
        nextValue: 'Sunwell',
      },
    }),
  )
})

it('invokes the update hook when updating a relational key', async () => {
  const countrySchema = z.object({ code: z.string() })
  const users = new Collection({
    schema: z.object({ country: countrySchema.optional() }),
  })
  const countries = new Collection({ schema: countrySchema })
  users.defineRelations(({ one }) => ({
    country: one(countries),
  }))

  const hook = vi.fn<HookEventListener<typeof users, 'update'>>((event) => {
    expect.soft(isRecord(event.data.prevRecord)).toBe(true)
    expect.soft(isRecord(event.data.nextRecord)).toBe(true)
  })
  users.hooks.on('update', hook)

  const user = await users.create({
    country: await countries.create({ code: 'us' }),
  })
  await users.update(user, {
    async data(user) {
      user.country = await countries.create({ code: 'uk' })
    },
  })

  expect.soft(hook).toHaveBeenCalledTimes(1)
  expect.soft(hook).toHaveBeenCalledWith(
    expect.objectContaining({
      data: {
        prevRecord: { country: { code: 'us' } },
        nextRecord: { country: { code: 'uk' } },
        path: ['country'],
        prevValue: { code: 'us' },
        nextValue: { code: 'uk' },
      },
    }),
  )
})

it('treats updates through relational keys like foreign record updates', async () => {
  const countrySchema = z.object({ code: z.string() })
  const users = new Collection({
    schema: z.object({ country: countrySchema.optional() }),
  })
  const countries = new Collection({ schema: countrySchema })
  users.defineRelations(({ one }) => ({
    country: one(countries),
  }))

  const usersHook = vi.fn<HookEventListener<typeof users, 'update'>>(
    (event) => {
      expect.soft(isRecord(event.data.prevRecord)).toBe(true)
      expect.soft(isRecord(event.data.nextRecord)).toBe(true)
    },
  )
  const countriesHook = vi.fn<HookEventListener<typeof countries, 'update'>>(
    (event) => {
      expect.soft(isRecord(event.data.prevRecord)).toBe(true)
      expect.soft(isRecord(event.data.nextRecord)).toBe(true)
    },
  )
  users.hooks.on('update', usersHook)
  countries.hooks.on('update', countriesHook)

  const user = await users.create({
    country: await countries.create({ code: 'us' }),
  })
  await users.update(user, {
    data(user) {
      user.country!.code = 'uk'
    },
  })

  expect.soft(usersHook).not.toHaveBeenCalled()

  expect.soft(countriesHook).toHaveBeenCalledTimes(1)
  expect.soft(countriesHook).toHaveBeenCalledWith(
    expect.objectContaining({
      data: {
        prevRecord: { code: 'us' },
        nextRecord: { code: 'uk' },
        path: ['code'],
        prevValue: 'us',
        nextValue: 'uk',
      },
    }),
  )
})

it('combines the owner updates and the relational key update', async () => {
  const countrySchema = z.object({ code: z.string() })
  const users = new Collection({
    schema: z.object({
      name: z.string(),
      country: countrySchema.optional(),
    }),
  })
  const countries = new Collection({ schema: countrySchema })
  users.defineRelations(({ one }) => ({
    country: one(countries),
  }))

  const usersHook = vi.fn<HookEventListener<typeof users, 'update'>>(
    (event) => {
      expect.soft(isRecord(event.data.prevRecord)).toBe(true)
      expect.soft(isRecord(event.data.nextRecord)).toBe(true)
    },
  )
  const countriesHook = vi.fn<HookEventListener<typeof countries, 'update'>>(
    (event) => {
      expect.soft(isRecord(event.data.prevRecord)).toBe(true)
      expect.soft(isRecord(event.data.nextRecord)).toBe(true)
    },
  )
  users.hooks.on('update', usersHook)
  countries.hooks.on('update', countriesHook)

  const user = await users.create({
    name: 'John',
    country: await countries.create({ code: 'us' }),
  })
  await users.update(user, {
    async data(user) {
      user.name = 'Johnatan'
      user.country = await countries.create({ code: 'uk' })
    },
  })

  expect.soft(usersHook).toHaveBeenCalledTimes(2)
  expect.soft(usersHook).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({
      data: {
        prevRecord: { name: 'John', country: { code: 'us' } },
        nextRecord: { name: 'Johnatan', country: { code: 'uk' } },
        path: ['name'],
        prevValue: 'John',
        nextValue: 'Johnatan',
      },
    }),
  )
  expect.soft(usersHook).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({
      data: {
        prevRecord: { name: 'John', country: { code: 'us' } },
        nextRecord: { name: 'Johnatan', country: { code: 'uk' } },
        path: ['country'],
        prevValue: { code: 'us' },
        nextValue: { code: 'uk' },
      },
    }),
  )
})

it('combines the owner updates and deep foreign record updates', async () => {
  const countrySchema = z.object({ code: z.string() })
  const users = new Collection({
    schema: z.object({
      name: z.string(),
      country: countrySchema.optional(),
    }),
  })
  const countries = new Collection({ schema: countrySchema })
  users.defineRelations(({ one }) => ({
    country: one(countries),
  }))

  const usersHook = vi.fn<HookEventListener<typeof users, 'update'>>(
    (event) => {
      expect.soft(isRecord(event.data.prevRecord)).toBe(true)
      expect.soft(isRecord(event.data.nextRecord)).toBe(true)
    },
  )
  const countriesHook = vi.fn<HookEventListener<typeof countries, 'update'>>(
    (event) => {
      expect.soft(isRecord(event.data.prevRecord)).toBe(true)
      expect.soft(isRecord(event.data.nextRecord)).toBe(true)
    },
  )
  users.hooks.on('update', usersHook)
  countries.hooks.on('update', countriesHook)

  const user = await users.create({
    name: 'John',
    country: await countries.create({ code: 'us' }),
  })
  await users.update(user, {
    data(user) {
      user.name = 'Johnatan'
      user.country!.code = 'uk'
    },
  })

  expect.soft(usersHook).toHaveBeenCalledTimes(1)
  expect.soft(usersHook).toHaveBeenCalledWith(
    expect.objectContaining({
      data: {
        prevRecord: { name: 'John', country: { code: 'us' } },
        /**
         * @note Relational keys will point to the latest values
         * even if observed through an unrelated update (e.g. "name").
         */
        nextRecord: { name: 'Johnatan', country: { code: 'uk' } },
        path: ['name'],
        prevValue: 'John',
        nextValue: 'Johnatan',
      },
    }),
  )

  expect.soft(countriesHook).toHaveBeenCalledTimes(1)
  expect.soft(countriesHook).toHaveBeenCalledWith(
    expect.objectContaining({
      data: {
        prevRecord: { code: 'us' },
        nextRecord: { code: 'uk' },
        path: ['code'],
        prevValue: 'us',
        nextValue: 'uk',
      },
    }),
  )
})

it('invokes the update hook for each change in the root-level draft', async () => {
  const users = new Collection({
    schema: z.object({
      id: z.number(),
      name: z.string().optional(),
    }),
  })
  const hook = vi.fn()
  users.hooks.on('update', hook)

  const user = await users.create({ id: 1 })
  await users.update(user, {
    data(user) {
      user.id = 2
      user.name = 'John'
    },
  })

  expect.soft(hook).toHaveBeenCalledTimes(2)
  expect.soft(hook).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({
      data: {
        prevRecord: { id: 1 },
        nextRecord: { id: 2, name: 'John' },
        path: ['id'],
        prevValue: 1,
        nextValue: 2,
      },
    }),
  )
  expect.soft(hook).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({
      data: {
        prevRecord: { id: 1 },
        nextRecord: { id: 2, name: 'John' },
        path: ['name'],
        prevValue: undefined,
        nextValue: 'John',
      },
    }),
  )
})

it('invokes the update hook for each change in a nested draft', async () => {
  const users = new Collection({
    schema: z.object({
      id: z.number(),
      address: z.object({
        street: z.object({
          name: z.string(),
          houseNumber: z.number(),
        }),
      }),
    }),
  })

  const hook = vi.fn()
  users.hooks.on('update', hook)

  const user = await users.create({
    id: 1,
    address: {
      street: {
        name: 'Baker',
        houseNumber: 123,
      },
    },
  })

  await users.update(user, {
    data(user) {
      user.address.street = {
        name: 'Sunwell',
        houseNumber: 456,
      }
    },
  })

  expect.soft(hook).toHaveBeenCalledTimes(1)
  expect.soft(hook).toHaveBeenCalledWith(
    expect.objectContaining({
      data: {
        prevRecord: {
          id: 1,
          address: { street: { name: 'Baker', houseNumber: 123 } },
        },
        nextRecord: {
          id: 1,
          address: { street: { name: 'Sunwell', houseNumber: 456 } },
        },
        path: ['address', 'street'],
        prevValue: { name: 'Baker', houseNumber: 123 },
        nextValue: { name: 'Sunwell', houseNumber: 456 },
      },
    }),
  )
})

it('prevents certain updates via the update hook', async () => {
  const users = new Collection({
    schema: z.object({
      id: z.number(),
      address: z.object({
        street: z.object({
          name: z.string(),
          houseNumber: z.number(),
        }),
      }),
    }),
  })

  const hook = vi.fn<HookEventListener<typeof users, 'update'>>((event) => {
    if (event.data.path.join('.') === 'address.street.name') {
      event.preventDefault()
    }
  })
  users.hooks.on('update', hook)

  const user = await users.create({
    id: 1,
    address: {
      street: {
        name: 'Baker',
        houseNumber: 123,
      },
    },
  })

  await expect(
    users.update(user, {
      data(user) {
        user.id = 2
        user.address.street.name = 'Sunwell'
        user.address.street.houseNumber = 456
      },
    }),
  ).resolves.toEqual({
    id: 2,
    address: {
      street: {
        name: 'Baker',
        houseNumber: 456,
      },
    },
  })
})
