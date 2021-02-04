import { debug } from 'debug'
import { Database, Relation, RelationKind } from '../glossary'
import { executeQuery } from '../query/executeQuery'
import { first } from '../utils/first'

const log = debug('defineRelationalProperties')

export function defineRelationalProperties(
  entity: Record<string, any>,
  relations: Record<string, Relation<any>>,
  db: Database,
): void {
  log('setting relations', relations)

  const properties = Object.entries(relations).reduce(
    (acc, [property, relation]) => {
      acc[property] = {
        get() {
          log(`get "${property}"`, relation)

          const refResults = relation.refs.reduce((acc, entityRef) => {
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

          log(`resolved "${relation.kind}" "${property}" to`, refResults)

          return relation.kind === RelationKind.OneOf
            ? first(refResults)
            : refResults
        },
      }

      return acc
    },
    {},
  )

  Object.defineProperties(entity, properties)
}
