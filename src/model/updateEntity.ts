import { mergeDeepRight } from 'ramda'
import { EntityInstance } from '../glossary'

/**
 * Update given entity with the data, potentially evolving
 * it based on the existing values.
 */
export function updateEntity(
  entity: EntityInstance<any, any>,
  data: any,
): EntityInstance<any, any> {
  const evolvedData = Object.entries(data).reduce((acc, [key, value]) => {
    // Ignore attempts to update entity with properties
    // that were not specified in the model declaration.
    if (!entity.hasOwnProperty(key)) {
      return acc
    }

    acc[key] = typeof value === 'function' ? value(entity[key]) : value
    return acc
  }, {})

  return mergeDeepRight(entity, evolvedData)
}
