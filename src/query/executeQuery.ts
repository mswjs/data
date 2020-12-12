import { debug } from 'debug'
import { Database, KeyType } from '../glossary'
import { compileQuery } from './compileQuery'
import { QuerySelector } from './queryTypes'
import { invariant } from '../utils/invariant'
import { getComparatorsForValue } from './getComparatorsForValue'
import { filter } from '../utils/filter'

const log = debug('executeQuery')

/**
 * Execute a given query against a model in the database.
 * Returns the list of results.
 */
export function executeQuery(
  modelName: string,
  primaryKey: string,
  query: QuerySelector<any>,
  db: Database<any>,
  limit?: number,
) {
  log(`${JSON.stringify(query)} on "${modelName}"`)

  invariant(
    db[modelName].size === 0,
    `Failed to execute query on the "${modelName}" model: unknown database model.`,
  )

  const { [primaryKey]: primaryKeyQuery, ...otherFieldsQuery } = query.which
  const records = filterEntitesByPrimaryKey(db[modelName], primaryKey, {
    which: { [primaryKey]: primaryKeyQuery },
  })

  const result = filter(
    records,
    compileQuery({ which: otherFieldsQuery }),
    limit,
  )
  log(`resolved query "${JSON.stringify(query)}" on "${modelName}" to`, result)

  return result
}

/**
 * Filter entities by primaryKey.
 */
export function filterEntitesByPrimaryKey(
  records: Map<KeyType, any>,
  primaryKey: string,
  query: QuerySelector<any>,
) {
  if (!records.size) return []

  const primaryKeyQuery = query.which ? query.which[primaryKey] : null

  if (!primaryKeyQuery) return Array.from(records.values())

  let { filteredKeys, remainingQuery } = Object.entries(primaryKeyQuery).reduce(
    (acc, [comparatorName, expectedValue]) => {
      if (comparatorName === 'equals') {
        acc.filteredKeys.push(expectedValue)
      } else if (comparatorName === 'in' && Array.isArray(expectedValue)) {
        acc.filteredKeys.push(...expectedValue)
      } else {
        acc.remainingQuery[comparatorName] = expectedValue
      }
      return acc
    },
    {
      filteredKeys: [],
      remainingQuery: {},
    },
  )

  if (!filteredKeys.length) filteredKeys = Array.from(records.keys())

  const ramainingQueryEntries = Object.entries(remainingQuery)
  if (ramainingQueryEntries.length > 0) {
    filteredKeys = filteredKeys.filter((key) => {
      const comparatorSet = getComparatorsForValue(key)
      return ramainingQueryEntries.reduce(
        (acc, [comparatorName, expectedValue]) => {
          if (!acc) return acc
          const comparatorFn = comparatorSet[comparatorName]
          const hasMatch = comparatorFn(expectedValue, key)
          return hasMatch
        },
        true,
      )
    })
  }

  return filteredKeys
    .filter((key) => records.has(key))
    .map((key) => records.get(key))
}
