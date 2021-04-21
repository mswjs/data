import { InternalEntityInstance, InternalEntityProperty } from '../glossary'

/**
 * Determines if the given object is an internal entity.
 */
export function isInternalEntity(
  value: Record<string, any>,
): value is InternalEntityInstance<any, any> {
  return (
    InternalEntityProperty.type in value &&
    InternalEntityProperty.primaryKey in value
  )
}
