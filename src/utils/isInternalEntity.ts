import { InternalEntity, InternalEntityProperty } from '../glossary'
import { isObject } from './isObject'

/**
 * Returns true if the given value is an internal entity object.
 */
export function isInternalEntity(
  value: Record<string, any>,
): value is InternalEntity<any, any> {
  return (
    isObject(value) &&
    InternalEntityProperty.type in value &&
    InternalEntityProperty.primaryKey in value
  )
}
