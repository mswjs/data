import { Collection } from '#/src/collection.js'
import type { HookEventListener } from '#/src/hooks.js'
import z from 'zod'

it('invokes the delete hook when a record is deleted', async () => {
  const users = new Collection({
    schema: z.object({ id: z.number() }),
  })

  const hook = vi.fn<HookEventListener<typeof users, 'delete'>>()
  users.hooks.on('delete', hook)

  await users.createMany(5, (index) => ({ id: index + 1 }))

  users.delete((q) => q.where({ id: 2 }))

  expect(hook).toHaveBeenCalledOnce()
  expect(hook).toHaveBeenCalledWith(
    expect.objectContaining({
      data: { deletedRecord: { id: 2 } },
    }),
  )
})

it('invokes the delete hook in the opposite order for every deleted record', async () => {
  const users = new Collection({
    schema: z.object({ id: z.number() }),
  })

  const hook = vi.fn<HookEventListener<typeof users, 'delete'>>()
  users.hooks.on('delete', hook)

  await users.createMany(5, (index) => ({ id: index + 1 }))

  users.deleteMany((q) => q.where({ id: (id) => id >= 2 && id <= 4 }))

  expect(hook).toHaveBeenCalledTimes(3)
  expect(hook).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({
      data: { deletedRecord: { id: 4 } },
    }),
  )
  expect(hook).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({
      data: { deletedRecord: { id: 3 } },
    }),
  )
  expect(hook).toHaveBeenNthCalledWith(
    3,
    expect.objectContaining({
      data: { deletedRecord: { id: 2 } },
    }),
  )
})

it('does not delete the record if the delete ecent is prevented', async () => {
  const users = new Collection({
    schema: z.object({ id: z.number() }),
  })

  const hook = vi.fn<HookEventListener<typeof users, 'delete'>>((event) => {
    event.preventDefault()
  })
  users.hooks.on('delete', hook)

  await users.createMany(3, (index) => ({ id: index + 1 }))
  users.delete((q) => q.where({ id: 2 }))
  expect(hook).toHaveBeenCalledOnce()
  expect(users.all()).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
})

it('allows preventing the default for specific records', async () => {
  const users = new Collection({
    schema: z.object({ id: z.number() }),
  })

  const hook = vi.fn<HookEventListener<typeof users, 'delete'>>((event) => {
    if (event.data.deletedRecord.id === 3) {
      event.preventDefault()
    }
  })
  users.hooks.on('delete', hook)

  await users.createMany(5, (index) => ({ id: index + 1 }))

  users.deleteMany((q) => q.where({ id: (id) => id >= 2 && id <= 4 }))

  expect(hook).toHaveBeenCalledTimes(3)
  expect(hook).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({
      data: { deletedRecord: { id: 4 } },
    }),
  )
  expect(hook).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({
      data: { deletedRecord: { id: 3 } },
    }),
  )
  expect(hook).toHaveBeenNthCalledWith(
    3,
    expect.objectContaining({
      data: { deletedRecord: { id: 2 } },
    }),
  )

  expect(users.all()).toEqual([{ id: 1 }, { id: 3 }, { id: 5 }])
})
