import { InternalEntity } from '../glossary'

/**
 * Update given entity with the data, potentially evolving
 * it based on the existing values.
 */
export function updateEntity(
  entity: InternalEntity<any, any>,
  data: any,
): InternalEntity<any, any> {
  return Object.entries(data).reduce<InternalEntity<any, any>>(
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
