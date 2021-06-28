import { InternalEntity, InternalEntityProperty } from '../glossary'

/**
 * Determines if the given object is an internal entity.
 */
export function isInternalEntity(
  value: Record<string, any>,
): value is InternalEntity<any, any> {
  return (
    value &&
    InternalEntityProperty.type in value &&
    InternalEntityProperty.primaryKey in value
  )
}
