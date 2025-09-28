import { Collection, type RecordType } from '#/src/collection.js'
import z from 'zod'

it('infers initial values from primitives in the schema', async () => {
  expectTypeOf(new Collection({ schema: z.object({ id: z.number() }) }).create)
    .parameter(0)
    .toEqualTypeOf<{ id: number }>()

  expectTypeOf(
    new Collection({ schema: z.object({ id: z.number().optional() }) }).create,
  )
    .parameter(0)
    .toEqualTypeOf<{ id?: number | undefined }>()

  expectTypeOf(new Collection({ schema: z.object({ id: z.string() }) }).create)
    .parameter(0)
    .toEqualTypeOf<{ id: string }>()
  z
  expectTypeOf(
    new Collection({ schema: z.object({ id: z.string().optional() }) }).create,
  )
    .parameter(0)
    .toEqualTypeOf<{ id?: string | undefined }>()
})

it('infers initial values from a nested schema', async () => {
  expectTypeOf(
    new Collection({
      schema: z.object({ address: z.object({ street: z.string() }) }),
    }).create,
  )
    .parameter(0)
    .toEqualTypeOf<{ address: { street: string } }>()

  expectTypeOf(
    new Collection({
      schema: z.object({
        address: z.object({ street: z.string().optional() }),
      }),
    }).create,
  )
    .parameter(0)
    .toEqualTypeOf<{ address: { street?: string | undefined } }>()

  expectTypeOf(
    new Collection({
      schema: z.object({
        address: z.object({ street: z.string() }).optional(),
      }),
    }).create,
  )
    .parameter(0)
    .toEqualTypeOf<{ address?: { street: string } | undefined }>()
})

it('infers the record type (return type) from the schema', async () => {
  expectTypeOf(
    new Collection({ schema: z.object({ id: z.number() }) }).create,
  ).returns.resolves.toEqualTypeOf<RecordType<{ id: number }>>()

  expectTypeOf(
    new Collection({ schema: z.object({ id: z.number().optional() }) }).create,
  ).returns.resolves.toEqualTypeOf<RecordType<{ id?: number | undefined }>>()

  expectTypeOf(
    new Collection({ schema: z.object({ id: z.string() }) }).create,
  ).returns.resolves.toEqualTypeOf<RecordType<{ id: string }>>()

  expectTypeOf(
    new Collection({ schema: z.object({ id: z.string().optional() }) }).create,
  ).returns.resolves.toEqualTypeOf<RecordType<{ id?: string | undefined }>>()

  expectTypeOf(
    new Collection({
      schema: z.object({ address: z.object({ street: z.string() }) }),
    }).create,
  ).returns.resolves.toEqualTypeOf<
    RecordType<{ address: { street: string } }>
  >()

  expectTypeOf(
    new Collection({
      schema: z.object({
        address: z.object({ street: z.string().optional() }),
      }),
    }).create,
  ).returns.resolves.toEqualTypeOf<
    RecordType<{ address: { street?: string | undefined } }>
  >()

  expectTypeOf(
    new Collection({
      schema: z.object({
        address: z.object({ street: z.string() }).optional(),
      }),
    }).create,
  ).returns.resolves.toEqualTypeOf<
    RecordType<{ address?: { street: string } | undefined }>
  >()
})
