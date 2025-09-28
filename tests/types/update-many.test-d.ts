import {
  Collection,
  type RecordType,
  type UpdateFunction,
  type UpdateOptions,
} from '#/src/collection.js'
import type { SortDirection } from '#/src/sort.js'
import z from 'zod'

it('infers return type from the schema', () => {
  const users = new Collection({
    schema: z.object({ id: z.number(), name: z.string() }),
  })

  expectTypeOf(() =>
    users.updateMany((q) => q.where({ id: 123 }), { data: () => {} }),
  ).returns.resolves.toEqualTypeOf<
    Array<RecordType<{ id: number; name: string }>>
  >()

  expectTypeOf(() =>
    users.updateMany((q) => q.where({ name: 'John' }), { data: () => {} }),
  ).returns.resolves.toEqualTypeOf<
    Array<RecordType<{ id: number; name: string }>>
  >()

  users.updateMany(
    (q) =>
      q.where({
        // @ts-expect-error
        id: 'invalid',
      }),
    { data: () => {} },
  )
  users.updateMany(
    (q) =>
      q.where({
        // @ts-expect-error
        name: 123,
      }),
    { data: () => {} },
  )
  users.updateMany(
    (q) =>
      q.where({
        // @ts-expect-error
        unknown: true,
      }),
    { data: () => {} },
  )
})

it('infers update data type from the schema', () => {
  const users = new Collection({
    schema: z.object({
      id: z.number(),
      name: z.string(),
      address: z
        .object({
          street: z.string(),
          zipCodes: z.array(z.number()),
        })
        .optional(),
    }),
  })

  expectTypeOf(users.updateMany)
    .parameter(1)
    .toHaveProperty('data')
    .toEqualTypeOf<
      UpdateFunction<{
        id: number
        name: string
        address?: {
          street: string
          zipCodes: Array<number>
        }
      }>
    >()
})

it('supports a `strict` mode', () => {
  const users = new Collection({
    schema: z.object({ id: z.number(), name: z.string() }),
  })

  expectTypeOf(users.updateMany)
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

  expectTypeOf(users.updateMany)
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
