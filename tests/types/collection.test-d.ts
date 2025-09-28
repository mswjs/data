import type { StandardSchemaV1 } from '@standard-schema/spec'
import { Collection, type CollectionOptions } from '#/src/collection.js'

it('annotates Collection constructor parameters', () => {
  expectTypeOf(Collection).constructorParameters.toEqualTypeOf<
    [CollectionOptions<StandardSchemaV1>]
  >()
})
