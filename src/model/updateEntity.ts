import { InternalEntityInstance } from '../glossary'

/**
 * Update given entity with the data, potentially evolving
 * it based on the existing values.
 */
export function updateEntity(
  entity: InternalEntityInstance<any, any>,
  data: any,
): InternalEntityInstance<any, any> {
  return Object.entries(data).reduce<InternalEntityInstance<any, any>>(
    (acc, [key, value]) => {
      // Ignore attempts to update entity with properties
      // that were not specified in the model definition.
      if (!entity.hasOwnProperty(key)) {
        return acc
      }

      acc[key] =
        typeof value === 'function' ? value(entity[key], entity) : value
      return acc
    },
    {
      ...entity,
    },
  )
}
