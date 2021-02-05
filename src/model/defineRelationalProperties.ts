import { debug } from 'debug'
import { Database } from '../db/Database'
import { EntityInstance, Relation, RelationKind } from '../glossary'
import { executeQuery } from '../query/executeQuery'
import { first } from '../utils/first'

const log = debug('defineRelationalProperties')

export function defineRelationalProperties(
  entity: EntityInstance<any, any>,
  relations: Record<string, Relation<any>>,
  db: Database<any>,
): void {
  log('setting relations', relations)

  const properties = Object.entries(relations).reduce(
    (acc, [property, relation]) => {
      log(
        `defining relation for property "${entity.__type}.${property}"`,
        relation,
      )

      if (relation.unique) {
        log(`verifying that the "${property}" relation is unique...`)

        /**
         * @fixme Is it safe to assume the first reference?
         */
        const firstRef = relation.refs[0]

        // Trying to look up an entity of the same type
        // that references the same relational entity.
        const existingEntities = executeQuery(
          entity.__type,
          entity.__primaryKey,
          {
            which: {
              [property]: {
                [firstRef.__primaryKey]: {
                  in: relation.refs.map((ref) => ref.__nodeId),
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

      acc[property] = {
        get() {
          log(`get "${property}"`, relation)

          const refValue = relation.refs.reduce((acc, entityRef) => {
            return acc.concat(
              executeQuery(
                entityRef.__type,
                entityRef.__primaryKey,
                {
                  which: {
                    [entityRef.__primaryKey]: {
                      equals: entityRef.__nodeId,
                    },
                  },
                },
                db,
              ),
            )
          }, [])

          log(`resolved "${relation.kind}" "${property}" to`, refValue)

          return relation.kind === RelationKind.OneOf
            ? first(refValue)
            : refValue
        },
      }

      return acc
    },
    {},
  )

  Object.defineProperties(entity, properties)
}
