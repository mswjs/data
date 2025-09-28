import {
  Collection,
  type RecordType,
  type UpdateFunction,
} from '#/src/collection.js'
import z from 'zod'

it('infers return type from the schema', () => {
  const users = new Collection({
    schema: z.object({ id: z.number(), name: z.string() }),
  })

  expectTypeOf(() =>
    users.update((q) => q.where({ id: 123 }), { data: () => {} }),
  ).returns.resolves.toEqualTypeOf<
    RecordType<{ id: number; name: string }> | undefined
  >()

  expectTypeOf(() =>
    users.update((q) => q.where({ name: 'John' }), { data: () => {} }),
  ).returns.resolves.toEqualTypeOf<
    RecordType<{ id: number; name: string }> | undefined
  >()

  users.update(
    (q) =>
      q.where({
        // @ts-expect-error
        id: 'invalid',
      }),
    { data: () => {} },
  )
  users.update(
    (q) =>
      q.where({
        // @ts-expect-error
        name: 123,
      }),
    { data: () => {} },
  )
  users.update(
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

  expectTypeOf(users.update).parameter(1).toHaveProperty('data').toEqualTypeOf<
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

  expectTypeOf(users.update)
    .parameter(1)
    .exclude<undefined>()
    .toHaveProperty('strict')
    .toEqualTypeOf<boolean | undefined>()
})

it('supports root-level drafts', () => {
  const users = new Collection({
    schema: z.object({ id: z.number(), name: z.string() }),
  })

  expectTypeOf(users.update)
    .parameter(1)
    .exclude<undefined>()
    .toHaveProperty('data')
    .extract<(...args: any[]) => any>()
    .toEqualTypeOf<UpdateFunction<{ id: number; name: string }>>()
})
