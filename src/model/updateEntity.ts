import { debug } from 'debug'
import get from 'lodash/get'
import { invariant } from 'outvariant'
import { Relation } from '../relations/Relation'
import {
  ENTITY_TYPE,
  Entity,
  ModelDefinition,
  PRIMARY_KEY,
  Value,
} from '../glossary'
import { isObject } from '../utils/isObject'
import { inheritInternalProperties } from '../utils/inheritInternalProperties'
import { NullableProperty } from '../nullable'

const log = debug('updateEntity')

/**
 * Update given entity with the data, potentially evolving
 * it based on the existing values.
 */
export function updateEntity(
  entity: Entity<any, any>,
  data: any,
  definition: ModelDefinition,
): Entity<any, any> {
  log('updating entity: %j, with data: %s', entity, data)
  log('model definition:', definition)

  const updateRecursively = (
    entityChunk: Entity<any, any>,
    data: any,
    parentPath: string = '',
  ): Entity<any, any> => {
    const result = Object.entries(data).reduce<Entity<any, any>>(
      (nextEntity, [propertyName, value]) => {
        const propertyPath = parentPath
          ? `${parentPath}.${propertyName}`
          : propertyName

        log(
          'updating propety "%s" to "%s" on "%s" ("%s"): %j',
          propertyPath,
          value,
          entity[ENTITY_TYPE],
          entity[entity[PRIMARY_KEY]],
          entityChunk,
        )

        /**
         * @note Entity chunk in this scope is always flat.
         */
        const prevValue = entityChunk[propertyName]
        const propertyDefinition = get(definition, propertyPath)

        log('definition for "%s":', propertyPath, propertyDefinition)
        log('previous value for "%s":', propertyName, prevValue)

        // Skip the properties not specified in the model definition.
        if (propertyDefinition == null) {
          log('unknown property "%s" on the entity, skipping...', propertyName)
          return nextEntity
        }

        // When updating a relational property,
        // re-define the relation instead of using the actual value.
        if (propertyDefinition instanceof Relation) {
          log(
            'property "%s" is a "%s" relation to "%s"!',
            propertyName,
            propertyDefinition.kind,
            propertyDefinition.target.modelName,
          )

          invariant(
            (value === null && propertyDefinition.nullable) ||
              isObject(value) ||
              Array.isArray(value),
            'Failed to update relational property "%s" on "%s": the next value must be an entity, a list of entities, or null if relation is nullable',
            propertyName,
            propertyDefinition.source.modelName,
          )

          log('updating the relation to resolve with:', value)

          // Re-define the relational property to now point at the next value.
          propertyDefinition.resolveWith(
            nextEntity,
            value as Value<any, any>[] | null,
          )

          return nextEntity
        }

        if (isObject(value)) {
          log('value is a plain object (%s), recursively updating...', value)
          nextEntity[propertyName] = updateRecursively(
            prevValue,
            value,
            propertyPath,
          )
          return nextEntity
        }

        const nextValue =
          typeof value === 'function' ? value(prevValue, entity) : value

        log('setting a value at "%s" to: %s', propertyName, nextValue)
        invariant(
          nextValue !== null || propertyDefinition instanceof NullableProperty,
          'Failed to set value at "%s" to null as the property is not nullable. Use the "nullable" function when defining your property',
          propertyName,
        )
        nextEntity[propertyName] = nextValue

        log('next entity:', nextEntity)

        return nextEntity
      },
      { ...entityChunk },
    )

    return result
  }

  const result = updateRecursively(entity, data)

  /**
   * @note Inherit the internal properties (type, primary key)
   * from the source (previous) entity.
   * Spreading the entity chunk strips off its symbols.
   */
  inheritInternalProperties(result, entity)

  log('successfully updated to:', result)

  return result
}
