import { Collection, type RecordType } from '#/src/collection.js'
import type { SortDirection } from '#/src/sort.js'
import z from 'zod'

it('does not require a query argument', () => {
  const users = new Collection({
    schema: z.object({ id: z.number(), name: z.string() }),
  })

  expectTypeOf(() => users.findMany()).returns.toEqualTypeOf<
    Array<RecordType<{ id: number; name: string }>>
  >()
})

it('infers return type from the schema', () => {
  const users = new Collection({
    schema: z.object({ id: z.number(), name: z.string() }),
  })

  expectTypeOf(() =>
    users.findMany((q) => q.where({ id: 123 })),
  ).returns.toEqualTypeOf<Array<RecordType<{ id: number; name: string }>>>()

  expectTypeOf(() =>
    users.findMany((q) => q.where({ name: 'John' })),
  ).returns.toEqualTypeOf<Array<RecordType<{ id: number; name: string }>>>()

  users.findMany((q) =>
    q.where({
      // @ts-expect-error
      id: 'invalid',
    }),
  )
  users.findMany((q) =>
    q.where({
      // @ts-expect-error
      name: 123,
    }),
  )
  users.findMany((q) =>
    q.where({
      // @ts-expect-error
      unknown: true,
    }),
  )
})

it('supports a strict mode', () => {
  const users = new Collection({
    schema: z.object({ id: z.number(), name: z.string() }),
  })

  expectTypeOf(users.findMany)
    .parameter(1)
    .exclude<undefined>()
    .toHaveProperty('strict')
    .toEqualTypeOf<boolean | undefined>()
})

it('strict mode has no effect on the return type', () => {
  const users = new Collection({
    schema: z.object({ id: z.number(), name: z.string() }),
  })

  expectTypeOf(() =>
    users.findMany((q) => q.where({ id: 123 }), { strict: true }),
  ).returns.toEqualTypeOf<Array<RecordType<{ id: number; name: string }>>>()
})

it('supports offset-based pagination', () => {
  const users = new Collection({
    schema: z.object({ id: z.number(), name: z.string() }),
  })

  users.findMany(undefined, { take: 5 })
  users.findMany(undefined, { skip: 10 })
  users.findMany(undefined, { take: 5, skip: 10 })
  users.findMany(undefined, { skip: 5, cursor: undefined })

  users.findMany(undefined, {
    skip: 5,
    cursor: users.findFirst(),
  })
})

it('supports cursor-based pagination', () => {
  const users = new Collection({
    schema: z.object({ id: z.number(), name: z.string() }),
  })
  const cursor = users.findFirst()

  users.findMany(undefined, { cursor })
  users.findMany(undefined, { take: 5, cursor })

  users.findMany(undefined, {
    cursor: users.findFirst(),
    skip: 5,
  })
})

it('supports sorting the results', () => {
  const users = new Collection({
    schema: z.object({
      id: z.number(),
      name: z.string(),
      nested: z.object({ key: z.string() }),
    }),
  })

  expectTypeOf(users.findMany)
    .parameter(1)
    .exclude<undefined>()
    .toHaveProperty('orderBy')
    .toEqualTypeOf<
      | {
          id?: SortDirection | undefined
          name?: SortDirection | undefined
          nested?: { key?: SortDirection | undefined }
        }
      | undefined
    >()
})
