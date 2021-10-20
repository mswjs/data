import { invariant } from 'outvariant'
import { ENTITY_TYPE, PRIMARY_KEY, Entity } from '../glossary'

export function inheritInternalProperties(
  target: Record<string, unknown>,
  source: Entity<any, any>,
): void {
  const entityType = source[ENTITY_TYPE]
  const primaryKey = source[PRIMARY_KEY]

  invariant(
    entityType,
    'Failed to inherit internal properties from (%j) to (%j): provided source entity has no entity type specified.',
    source,
    target,
  )
  invariant(
    primaryKey,
    'Failed to inherit internal properties from (%j) to (%j): provided source entity has no primary key specified.',
    source,
    target,
  )

  Object.defineProperties(target, {
    [ENTITY_TYPE]: {
      enumerable: true,
      value: entityType,
    },
    [PRIMARY_KEY]: {
      enumerable: true,
      value: primaryKey,
    },
  })
}
