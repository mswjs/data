import { Collection, type RecordType } from '#/src/collection.js'
import z from 'zod'

it('infers the initial value factory and return types from the schema', () => {
  const users = new Collection({ schema: z.object({ id: z.number() }) })

  expectTypeOf(users.createMany).parameter(0).toBeNumber()
  expectTypeOf(users.createMany)
    .parameter(1)
    .toEqualTypeOf<(index: number) => { id: number }>()
  expectTypeOf(users.createMany).returns.resolves.toEqualTypeOf<
    Array<RecordType<{ id: number }>>
  >()
})
