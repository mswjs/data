import { debug } from 'debug'
import { Database, RelationalNode, RelationKind } from '../glossary'
import { executeQuery } from '../query/executeQuery'
import { first } from '../utils/first'

const log = debug('relationalProperty')

export function defineRelationalProperties(
  entity: Record<string, any>,
  relations: Record<string, RelationalNode>,
  db: Database<any>
): void {
  const properties = Object.entries(relations).reduce(
    (acc, [property, relation]) => {
      acc[property] = {
        get() {
          log(`get "${property}"`, relation)

          const refResults = relation.nodes.reduce((acc, node) => {
            return acc.concat(
              executeQuery(
                node.__type,
                {
                  which: {
                    __nodeId: {
                      equals: node.__nodeId,
                    },
                  },
                },
                db
              )
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
    {}
  )

  Object.defineProperties(entity, properties)
}
