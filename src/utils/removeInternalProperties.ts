import set from 'lodash/set'
import {
  InternalEntity,
  InternalEntityProperty,
  Entity,
  ModelDictionary,
  Value,
} from '../glossary'
import { isInternalEntity } from './isInternalEntity'
import { isObject } from './isObject'

function isOneOfRelation(
  value: Value<any, any>,
): value is InternalEntity<any, any> {
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
  result: Entity<any, ModelName> = {},
): Entity<Dictionary, ModelName> {
  for (const [propertyName, value] of Object.entries(entity)) {
    // Remove the internal entity properties.
    if (
      propertyName === InternalEntityProperty.type ||
      propertyName === InternalEntityProperty.primaryKey
    ) {
      continue
    }

    // Remove the internal properties of a "oneOf" relation.
    if (
      isOneOfRelation(
        // @ts-ignore
        value,
      )
    ) {
      const relationalEntity = removeInternalProperties(value)
      set(result, propertyName, relationalEntity)
      continue
    }

    // Remove the internal properties of a "manyOf" relation.
    if (
      isManyOfRelation(
        // @ts-ignore
        value,
      )
    ) {
      const relationalEntityList = value.map(
        (
          // @ts-ignore
          node,
        ) => removeInternalProperties(node),
      )
      set(result, propertyName, relationalEntityList)
      continue
    }

    if (isObject(value)) {
      set(
        result,
        propertyName,
        removeInternalProperties(value as any, result[propertyName]),
      )
      continue
    }

    set(result, propertyName, value)
  }

  return result
}
