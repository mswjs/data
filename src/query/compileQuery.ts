import { debug } from 'debug'
import { ComparatorFn, QuerySelector } from './queryTypes'
import { getComparatorsForValue } from './getComparatorsForValue'
import { isObject } from '../utils/isObject'

const log = debug('compileQuery')

/**
 * Compile a query expression into a function that accepts an actual entity
 * and returns a query execution result (whether the entity satisfies the query).
 */
export function compileQuery<Data extends Record<string, any>>(
  query: QuerySelector<any>,
) {
  log(JSON.stringify(query))

  return (data: Data): boolean => {
    return Object.entries(query.where)
      .map<boolean>(([property, queryChunk]) => {
        const actualValue = data[property]

        log('executing query chunk', queryChunk, data)
        log('actual value for "%s"', property, actualValue)

        if (!queryChunk) {
          return true
        }

        return Object.entries(queryChunk).reduce<boolean>(
          (acc, [comparatorName, expectedValue]) => {
            if (!acc) {
              return acc
            }

            if (Array.isArray(actualValue)) {
              log(
                'actual value is array, checking if at least one item matches...',
                {
                  comparatorName,
                  expectedValue,
                },
              )

              /**
               * @fixme Can assume `some`? Why not `every`?
               */
              return actualValue.some((value) => {
                return compileQuery({ where: queryChunk })(value)
              })
            }

            // When the actual value is a resolved relational property reference,
            // execute the current query chunk on the referenced entity.
            if (actualValue.__type || isObject(actualValue)) {
              return compileQuery({ where: queryChunk })(actualValue)
            }

            const comparatorSet = getComparatorsForValue(actualValue)
            log('comparators', comparatorSet)

            const comparatorFn = (comparatorSet as any)[
              comparatorName
            ] as ComparatorFn<any, any>
            return comparatorFn(expectedValue, actualValue)
          },
          true,
        )
      })
      .every(Boolean)
  }
}
