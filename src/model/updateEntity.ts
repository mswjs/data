import { debug } from 'debug'
import get from 'lodash/get'
import { invariant } from 'outvariant'
import { Relation } from '../relations/Relation'
import { InternalEntity, ModelDefinition, Value } from '../glossary'
import { isObject } from '../utils/isObject'

const log = debug('updateEntity')

/**
 * Update given entity with the data, potentially evolving
 * it based on the existing values.
 */
export function updateEntity(
  entity: InternalEntity<any, any>,
  data: any,
  definition: ModelDefinition,
): InternalEntity<any, any> {
  log('updating entity: %j, with data: %s', entity, data)
  log('model definition:', definition)

  const updateRecursively = (
    entityChunk: InternalEntity<any, any>,
    data: any,
    parentPath: string = '',
  ): InternalEntity<any, any> => {
    const result = Object.entries(data).reduce<InternalEntity<any, any>>(
      (nextEntity, [propertyName, value]) => {
        const propertyPath = parentPath
          ? `${parentPath}.${propertyName}`
          : propertyName

        log(
          'updating propety "%s" ("%s") to "%s" on: %j',
          propertyName,
          propertyPath,
          value,
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
            isObject(value) || Array.isArray(value),
            'Failed to update relational property "%s" on "%s": the next value must be an entity or a list of entities.',
            propertyName,
            propertyDefinition.source.modelName,
          )

          log('updating the relation to resolve with:', value)

          // Re-define the relational property to now point at the next value.
          propertyDefinition.resolveWith(entity, value as Value<any, any>[])

          return entityChunk
        }

        if (isObject(value)) {
          log('value is a plain object (%s), recursively updating...', value)
          entityChunk[propertyName] = updateRecursively(
            prevValue,
            value,
            propertyPath,
          )
          return entityChunk
        }

        const nextValue =
          typeof value === 'function' ? value(prevValue, entity) : value

        log('setting a value at "%s" to: %s', propertyName, nextValue)
        nextEntity[propertyName] = nextValue

        return nextEntity
      },
      { ...entityChunk },
    )

    return result
  }

  return updateRecursively(entity, data)
}
