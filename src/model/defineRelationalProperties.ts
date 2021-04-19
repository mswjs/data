import { debug } from 'debug'
import { Database } from '../db/Database'
import {
  EntityInstance,
  ModelDictionary,
  Relation,
  RelationKind,
  Value,
} from '../glossary'
import { executeQuery } from '../query/executeQuery'
import { first } from '../utils/first'

const log = debug('defineRelationalProperties')

export function defineRelationalProperties(
  entity: EntityInstance<any, any>,
  initialValues: Partial<Value<any, ModelDictionary>>,
  relations: Record<string, Relation>,
  db: Database<any>,
): void {
  log('setting relations', relations, entity)

  const properties = Object.entries(relations).reduce<
    Record<
      string,
      { get(): EntityInstance<any, any> | EntityInstance<any, any>[] }
    >
  >((properties, [property, relation]) => {
    log(`defining relational property "${entity.__type}.${property}"`, relation)

    // Take the relational entity reference from the initial values.
    const entityRefs: EntityInstance<any, any>[] = [].concat(
      initialValues[property],
    )

    if (relation.unique) {
      log(`verifying that the "${property}" relation is unique...`)

      /**
       * @fixme Is it safe to assume the first reference?
       */
      const firstRef = entityRefs[0]

      // Trying to look up an entity of the same type
      // that references the same relational entity.
      const existingEntities = executeQuery(
        entity.__type,
        entity.__primaryKey,
        {
          where: {
            [property]: {
              [firstRef.__primaryKey]: {
                in: entityRefs.map(
                  (entityRef) => entityRef[entity.__primaryKey],
                ),
              },
            },
          },
        },
        db,
      )

      log(
        `existing entities that reference the same "${property}"`,
        existingEntities,
      )

      if (existingEntities.length > 0) {
        log(`found a non-unique relational entity!`)

        throw new Error(
          `Failed to create a unique "${relation.modelName}" relation for "${
            entity.__type
          }.${property}" (${
            entity[entity.__primaryKey]
          }): the provided entity is already used.`,
        )
      }
    }

    properties[property] = {
      get() {
        log(`get "${property}"`, relation)

        const refValue = entityRefs.reduce<EntityInstance<any, any>[]>(
          (list, entityRef) => {
            return list.concat(
              executeQuery(
                entityRef.__type,
                entityRef.__primaryKey,
                {
                  where: {
                    [entityRef.__primaryKey]: {
                      equals: entityRef[entityRef.__primaryKey],
                    },
                  },
                },
                db,
              ),
            )
          },
          [],
        )

        log(`resolved "${relation.kind}" "${property}" to`, refValue)

        return relation.kind === RelationKind.OneOf ? first(refValue) : refValue
      },
    }

    return properties
  }, {})

  Object.defineProperties(entity, properties)
}
