import set from 'lodash/set'
import {
  InternalEntity,
  InternalEntityProperty,
  Entity,
  ModelDictionary,
  Value,
} from '../glossary'
import { isInternalEntity } from './isInternalEntity'

function isOneOfRelation<
  Dictionary extends ModelDictionary,
  ModelName extends keyof Dictionary,
>(
  value: Value<Dictionary[ModelName], Dictionary>,
): value is InternalEntity<Dictionary, ModelName> {
  return isInternalEntity(value)
}

function isManyOfRelation(
  value: Value<any, any>,
): value is Array<InternalEntity<any, any>> {
  return Array.isArray(value) && value.every(isInternalEntity)
}

/**
 * Removes internal properties from the given entity.
 */
export function removeInternalProperties<
  Dictionary extends ModelDictionary,
  ModelName extends keyof Dictionary,
>(
  entity: InternalEntity<Dictionary, ModelName>,
): Entity<Dictionary, ModelName> {
  return Object.entries(entity).reduce<Entity<any, ModelName>>(
    (entity, [property, value]) => {
      // Remove the internal entity properties.
      if (
        property === InternalEntityProperty.type ||
        property === InternalEntityProperty.primaryKey
      ) {
        return entity
      }

      // Remove the internal properties of a "oneOf" relation.
      if (isOneOfRelation(value)) {
        const relationalEntity = removeInternalProperties(value)
        set(entity, property, relationalEntity)
        return entity
      }

      // Remove the internal properties of a "manyOf" relation.
      if (isManyOfRelation(value)) {
        const relationalEntityList = value.map(removeInternalProperties)
        set(entity, property, relationalEntityList)
        return entity
      }

      // Otherwise dealing with a base type value, preserving.
      set(entity, property, value)
      return entity
    },
    {},
  )
}
