import { Collection, type RecordType } from '#/src/collection.js'
import z from 'zod'

it('does not require a query argument', () => {
  const users = new Collection({
    schema: z.object({ id: z.number(), name: z.string() }),
  })

  expectTypeOf(() => users.findFirst()).returns.toEqualTypeOf<
    RecordType<{ id: number; name: string }> | undefined
  >()
})

it('infers return type from the schema', () => {
  const users = new Collection({
    schema: z.object({ id: z.number(), name: z.string() }),
  })

  expectTypeOf(() =>
    users.findFirst((q) => q.where({ id: 123 })),
  ).returns.toEqualTypeOf<
    RecordType<{ id: number; name: string }> | undefined
  >()

  expectTypeOf(() =>
    users.findFirst((q) => q.where({ name: 'John' })),
  ).returns.toEqualTypeOf<
    RecordType<{ id: number; name: string }> | undefined
  >()

  users.findFirst((q) =>
    q.where({
      // @ts-expect-error
      id: 'invalid',
    }),
  )
  users.findFirst((q) =>
    q.where({
      // @ts-expect-error
      name: 123,
    }),
  )
  users.findFirst((q) =>
    q.where({
      // @ts-expect-error
      unknown: true,
    }),
  )
})

it('annotates the return type as non-nullable if `strict` is set to true', () => {
  const users = new Collection({
    schema: z.object({ id: z.number(), name: z.string() }),
  })

  expectTypeOf(() =>
    users.findFirst((q) => q.where({ id: 123 }), { strict: true }),
  ).returns.toEqualTypeOf<RecordType<{ id: number; name: string }>>()
})

it('supports a strict mode', () => {
  const users = new Collection({
    schema: z.object({ id: z.number(), name: z.string() }),
  })

  expectTypeOf(users.findFirst)
    .parameter(1)
    .exclude<undefined>()
    .toHaveProperty('strict')
    .toEqualTypeOf<boolean | undefined>()
})
