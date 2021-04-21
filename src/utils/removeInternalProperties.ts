import { InternalEntity, InternalEntityProperty, Entity } from '../glossary'
import { isInternalEntity } from './isInternalEntity'

/**
 * Removes internal properties from the given entity.
 */
export function removeInternalProperties<
  Dictionary extends Record<string, any>,
  ModelName extends keyof Dictionary
>(
  entity: InternalEntity<Dictionary, ModelName>,
): Entity<Dictionary, ModelName> {
  return (
    Object.entries(entity)
      // Remove internal entity properties.
      .filter(([property, value]) => {
        if (
          property !== InternalEntityProperty.type &&
          property !== InternalEntityProperty.primaryKey
        ) {
          return [property, value]
        }
      })
      .map<[string, Entity<Dictionary, ModelName>]>(([property, value]) => {
        // Remove internal properties of a "oneOf" relation.
        if (typeof value === 'object' && isInternalEntity(value)) {
          return [property, removeInternalProperties(value)]
        }

        // Remove internal properties of a "manyOf" relation.
        if (Array.isArray(value)) {
          const publicEntity = value.map((relationalEntity: any) => {
            return isInternalEntity(relationalEntity)
              ? removeInternalProperties(relationalEntity)
              : relationalEntity
          })

          return [property, publicEntity]
        }

        return [property, value]
      })
      .reduce<any>((entity, [property, value]) => {
        entity[property] = value
        return entity
      }, {})
  )
}
