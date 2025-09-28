import { Collection, type RecordType } from '#/src/collection.js'
import type { SortDirection } from '#/src/sort.js'
import z from 'zod'

it('infers return type from the schema', () => {
  const users = new Collection({
    schema: z.object({ id: z.number(), name: z.string() }),
  })

  expectTypeOf(() =>
    users.deleteMany((q) => q.where({ id: 123 })),
  ).returns.toEqualTypeOf<Array<RecordType<{ id: number; name: string }>>>()

  expectTypeOf(() =>
    users.deleteMany((q) => q.where({ name: 'John' })),
  ).returns.toEqualTypeOf<Array<RecordType<{ id: number; name: string }>>>()

  users.deleteMany((q) =>
    q.where({
      // @ts-expect-error
      id: 'invalid',
    }),
  )
  users.deleteMany((q) =>
    q.where({
      // @ts-expect-error
      name: 123,
    }),
  )
  users.deleteMany((q) =>
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

  expectTypeOf(users.deleteMany)
    .parameter(1)
    .exclude<undefined>()
    .toHaveProperty('strict')
    .toEqualTypeOf<boolean | undefined>()
})

it('supports sorting the results', () => {
  const users = new Collection({
    schema: z.object({
      id: z.number(),
      name: z.string(),
      nested: z.object({ key: z.string() }),
    }),
  })

  expectTypeOf(users.deleteMany)
    .parameter(1)
    .exclude<undefined>()
    .toHaveProperty('orderBy')
    .toEqualTypeOf<
      | {
          id?: SortDirection
          name?: SortDirection
          nested?: { key?: SortDirection }
        }
      | undefined
    >()
})
