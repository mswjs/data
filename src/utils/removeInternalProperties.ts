import { EntityInstance, InternalEntityProperties } from '../glossary'

/**
 * Remove internal properties from the given entity.
 */
export function removeInternalProperties<
  Entity extends EntityInstance<any, any>
>(entity: Entity): Omit<Entity, keyof InternalEntityProperties<any>> {
  return Object.entries(entity).reduce<any>((result, [key, value]) => {
    if (!key.startsWith('__')) {
      result[key] = value
    }

    return result
  }, {})
}
