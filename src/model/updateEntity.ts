import { debug } from 'debug'
import { Database } from '../db/Database'
import { Relation } from '../relations/Relation'
import {
  InternalEntity,
  InternalEntityProperty,
  ModelDefinition,
} from '../glossary'
import { invariant } from '../utils/invariant'
import { isObject } from '../utils/isObject'
import { addRelation } from './defineRelationalProperties'

const log = debug('updateEntity')

/**
 * Update given entity with the data, potentially evolving
 * it based on the existing values.
 */
export function updateEntity(
  entity: InternalEntity<any, any>,
  data: any,
  definition: ModelDefinition,
  db: Database<any>,
): InternalEntity<any, any> {
  log('updating entity: %j, with data: %s', entity, data)

  const updateRecursively = (
    entityChunk: InternalEntity<any, any>,
    data: any,
  ): InternalEntity<any, any> => {
    const result = Object.entries(data).reduce<InternalEntity<any, any>>(
      (nextEntity, [propertyName, value]) => {
        log(
          'updating propety "%s" to "%s" on: %j',
          propertyName,
          value,
          entityChunk,
        )

        const propertyDefinition = definition[propertyName]
        const prevValue = entityChunk[propertyName]

        log('previous value for "%s":', propertyName, prevValue)

        if (!entityChunk.hasOwnProperty(propertyName)) {
          log('unknown property "%s" on the entity, skipping...', propertyName)
          return nextEntity
        }

        // When updating a relational property,
        // re-define the relation instead of using the actual value.
        if (propertyDefinition instanceof Relation) {
          const entityType = entity[InternalEntityProperty.type]

          invariant(
            isObject(value) || Array.isArray(value),
            `Failed to update relational property "${propertyName}" on "${entityType}": the next value must be an entity or a list of entities.`,
          )

          /**
           * @fixme Design a better interface for relations
           * so that it holds the referenced model's primary key
           * without the need to look it up every time.
           */
          // In "manyOf" relation the previous value will be an array of entities.
          // Get the first entity and its primary key property name.
          const primaryKey = [].concat(prevValue)[0][
            InternalEntityProperty.primaryKey
          ]

          // Re-define the relational property to now point at the next value.
          addRelation(
            entityChunk,
            propertyName,
            {
              ...propertyDefinition,
              primaryKey,
            },
            value,
            db,
          )

          return entityChunk
        }

        if (isObject(value)) {
          log('value is a plain object (%s), recursively updating...', value)
          entityChunk[propertyName] = updateRecursively(prevValue, value)
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
