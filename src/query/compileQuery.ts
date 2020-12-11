import { debug } from 'debug'
import { QuerySelector } from '../queryTypes'
import { getComparatorsForValue } from '../utils/comparators'

const log = debug('compileQuery')

/**
 * Compile a query expression into a function that accepts an actual entity
 * and returns a query execution result (whether the entity satisfies the query).
 */
export function compileQuery(query: QuerySelector<any>) {
  log(JSON.stringify(query))

  return (entity: any) => {
    return Object.entries(query.which)
      .map<boolean>(([propName, queryChunk]) => {
        const actualValue = entity[propName]
        const comparatorSet = getComparatorsForValue(actualValue)
        
        log({ queryChunk, actualValue })

        return Object.entries(queryChunk).reduce<boolean>(
          (acc, [comparatorName, expectedValue]) => {
            if (!acc) {
              return acc
            }

            // When the actual value is a resolved relational property reference,
            // execute the current query chunk on it.
            if (actualValue.__type) {
              return compileQuery({ which: queryChunk })(actualValue)
            }

            const comparatorFn = comparatorSet[comparatorName]
            const hasMatch = comparatorFn(expectedValue, actualValue)
            return hasMatch
          },
          true
        )
      })
      .every(Boolean)
  }
}
