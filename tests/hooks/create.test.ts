import { Collection } from '#/src/collection.js'
import type { HookEventListener } from '#/src/hooks.js'
import z from 'zod'

it('invokes the create hook when a new record is created', async () => {
  const users = new Collection({
    schema: z.object({
      id: z.number(),
    }),
  })

  const hook = vi.fn<HookEventListener<typeof users, 'create'>>()
  users.hooks.on('create', hook)

  await users.create({ id: 1 })
  await users.create({ id: 2 })

  expect.soft(hook).toHaveBeenCalledTimes(2)
  expect.soft(hook).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({
      data: {
        initialValues: { id: 1 },
        record: { id: 1 },
      },
    }),
  )
  expect.soft(hook).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({
      data: {
        initialValues: { id: 2 },
        record: { id: 2 },
      },
    }),
  )
})

it('differentiates between initial values and the created record', async () => {
  const users = new Collection({
    schema: z.object({
      id: z.number(),
      name: z.string().optional(),
      subscribed: z.boolean().default(false),
    }),
  })

  const hook = vi.fn<HookEventListener<typeof users, 'create'>>()
  users.hooks.on('create', hook)

  await users.create({ id: 1 })
  await users.create({ id: 2, name: 'John' })
  await users.create({ id: 3, subscribed: true })

  expect.soft(hook).toHaveBeenCalledTimes(3)
  expect.soft(hook).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({
      data: {
        initialValues: { id: 1 },
        record: { id: 1, subscribed: false },
      },
    }),
  )
  expect.soft(hook).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({
      data: {
        initialValues: { id: 2, name: 'John' },
        record: { id: 2, name: 'John', subscribed: false },
      },
    }),
  )
  expect.soft(hook).toHaveBeenNthCalledWith(
    3,
    expect.objectContaining({
      data: {
        initialValues: { id: 3, subscribed: true },
        record: { id: 3, subscribed: true },
      },
    }),
  )
})
