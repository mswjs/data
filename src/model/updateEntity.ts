import { debug } from 'debug'
import get from 'lodash/get'
import set from 'lodash/set'
import { invariant } from 'outvariant'
import { Relation, RelationKind } from '../relations/Relation'
import { ENTITY_TYPE, PRIMARY_KEY, Entity, ModelDefinition } from '../glossary'
import { isObject } from '../utils/isObject'
import { inheritInternalProperties } from '../utils/inheritInternalProperties'
import { NullableObject, NullableProperty } from '../nullable'
import { spread } from '../utils/spread'
import { getDefinition } from './getDefinition'

const log = debug('updateEntity')

/**
 * Update an entity with the given next data.
 */
export function updateEntity(
  entity: Entity<any, any>,
  data: Record<string, any>,
  definition: ModelDefinition,
): Entity<any, any> {
  log('updating entity:\n%j\nwith data:\n%j', entity, data)
  log('model definition:', definition)

  const nextEntity = spread(entity)
  inheritInternalProperties(nextEntity, entity)

  const updateRecursively = (data: any, parentPath: string[] = []): void => {
    log('updating path "%s" to:', parentPath, data)

    for (const [propertyName, value] of Object.entries(data)) {
      const propertyPath = parentPath.concat(propertyName)

      const prevValue = get(nextEntity, propertyPath)
      log('previous value for "%s":', propertyPath, prevValue)

      const nextValue =
        typeof value === 'function' ? value(prevValue, entity) : value
      log('next value for "%s":', propertyPath, nextValue)

      const propertyDefinition = getDefinition(definition, propertyPath)

      log('property definition for "%s":', propertyPath, propertyDefinition)

      if (propertyDefinition == null) {
        log(
          'skipping an unknown property "%s" on "%s"...',
          propertyName,
          entity[ENTITY_TYPE],
        )
        continue
      }

      if (propertyDefinition instanceof Relation) {
        log(
          'property "%s" is a "%s" relationship to "%s"',
          propertyPath,
          propertyDefinition.kind,
          propertyDefinition.target.modelName,
        )

        const location = `${nextEntity[ENTITY_TYPE]}.${propertyPath.join('.')}`

        if (nextValue == null) {
          // Forbid updating a non-nullable relationship to null.
          invariant(
            propertyDefinition.attributes.nullable,
            'Failed to update a "%s" relationship to "%s" at "%s" (%s: "%s"): cannot update a non-nullable relationship to null.',
            propertyDefinition.kind,
            propertyDefinition.target.modelName,
            location,
            nextEntity[PRIMARY_KEY],
            nextEntity[nextEntity[PRIMARY_KEY]],
          )

          log(
            're-defining the "%s" relationship on "%s" to: null',
            propertyName,
            nextEntity[ENTITY_TYPE],
          )
          propertyDefinition.resolveWith(nextEntity, null)
          continue
        }

        if (propertyDefinition.kind === RelationKind.ManyOf) {
          // Forbid updating a "MANY_OF" relation to a non-array value.
          invariant(
            Array.isArray(nextValue),
            'Failed to update a "%s" relationship to "%s" at "%s" (%s: "%s"): expected the next value to be an array of entities but got %j.',
            propertyDefinition.kind,
            propertyDefinition.target.modelName,
            location,
            nextEntity[PRIMARY_KEY],
            nextEntity[nextEntity[PRIMARY_KEY]],
            nextValue,
          )

          nextValue.forEach((ref, index) => {
            // Forbid providing a compatible plain object in any array members.
            invariant(
              ref[ENTITY_TYPE],
              'Failed to update a "%s" relationship to "%s" at "%s" (%s: "%s"): expected the next value at index %d to be an entity but got %j.',
              propertyDefinition.kind,
              propertyDefinition.target.modelName,
              location,
              nextEntity[PRIMARY_KEY],
              nextEntity[nextEntity[PRIMARY_KEY]],
              index,
              ref,
            )

            // Forbid referencing a different model in any array members.
            invariant(
              ref[ENTITY_TYPE] === propertyDefinition.target.modelName,
              'Failed to update a "%s" relationship to "%s" at "%s" (%s: "%s"): expected the next value at index %d to reference a "%s" but got "%s".',
              propertyDefinition.kind,
              propertyDefinition.target.modelName,
              location,
              nextEntity[PRIMARY_KEY],
              nextEntity[nextEntity[PRIMARY_KEY]],
              index,
              propertyDefinition.target.modelName,
              ref[ENTITY_TYPE],
            )
          })

          propertyDefinition.resolveWith(nextEntity, nextValue)
          continue
        }

        // Forbid updating a relationship with a compatible plain object.
        invariant(
          nextValue[ENTITY_TYPE],
          'Failed to update a "%s" relationship to "%s" at "%s" (%s: "%s"): expected the next value to be an entity but got %j.',
          propertyDefinition.kind,
          propertyDefinition.target.modelName,
          location,
          nextEntity[PRIMARY_KEY],
          nextEntity[nextEntity[PRIMARY_KEY]],
          nextValue,
        )

        // Forbid updating a relationship to an entity of a different model.
        invariant(
          nextValue[ENTITY_TYPE] == propertyDefinition.target.modelName,
          'Failed to update a "%s" relationship to "%s" at "%s" (%s: "%s"): expected the next value to reference a "%s" but got "%s" (%s: "%s").',
          propertyDefinition.kind,
          propertyDefinition.target.modelName,
          location,
          nextEntity[PRIMARY_KEY],
          nextEntity[nextEntity[PRIMARY_KEY]],
          propertyDefinition.target.modelName,
          nextValue[ENTITY_TYPE],
          nextValue[PRIMARY_KEY],
          nextValue[nextValue[PRIMARY_KEY]],
        )

        // Re-define the relationship only if its next value references a different entity
        // than before. That means a new compatible entity was created as the next value.
        if (
          prevValue?.[prevValue?.[PRIMARY_KEY]] !==
          nextValue[nextValue[PRIMARY_KEY]]
        ) {
          log(
            'next referenced "%s" (%s: "%s") differs from the previous (%s: "%s"), re-defining the relationship...',
            propertyDefinition.target.modelName,
            nextValue[PRIMARY_KEY],
          )
          propertyDefinition.resolveWith(nextEntity, nextValue)
        }

        continue
      }

      // Support updating nested objects.
      if (isObject(nextValue)) {
        log(
          'next value at "%s" is an object: %j, recursively updating...',
          propertyPath,
          nextValue,
        )
        updateRecursively(nextValue, propertyPath)
        continue
      }

      invariant(
        nextValue !== null ||
          propertyDefinition instanceof NullableProperty ||
          propertyDefinition instanceof NullableObject,
        'Failed to update "%s" on "%s": cannot set a non-nullable property to null.',
        propertyName,
        entity[ENTITY_TYPE],
      )

      log('updating a plain property "%s" to:', propertyPath, nextValue)
      set(nextEntity, propertyPath, nextValue)
    }
  }

  updateRecursively(data)

  log('successfully updated to:', nextEntity)

  return nextEntity
}
