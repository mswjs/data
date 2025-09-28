import type { StandardSchemaV1 } from '@standard-schema/spec'
import { Emitter, TypedEvent } from 'rettime'
import type { Collection, RecordType } from '#/src/collection.js'

export type HookEventMap<Schema extends StandardSchemaV1> = {
  create: TypedEvent<{
    record: RecordType<StandardSchemaV1.InferOutput<Schema>>
    initialValues?: StandardSchemaV1.InferInput<Schema>
  }>
  update: TypedEvent<{
    prevRecord: RecordType<StandardSchemaV1.InferOutput<Schema>>
    nextRecord: RecordType<StandardSchemaV1.InferOutput<Schema>>
    path: Array<symbol | string | number>
    prevValue: unknown
    nextValue: unknown
  }>
  delete: TypedEvent<{
    deletedRecord: RecordType<StandardSchemaV1.InferOutput<Schema>>
  }>
}

export type HookEventListener<
  T extends Collection<any>,
  Hook extends keyof HookEventMap<Schema>,
  Schema extends StandardSchemaV1 = T extends Collection<infer Schema>
    ? Schema
    : any,
> = Emitter.ListenerType<T['hooks'], Hook>

export function createHooksEmitter<Schema extends StandardSchemaV1>() {
  const emitter = new Emitter<HookEventMap<Schema>>()

  return emitter
}
