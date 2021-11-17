import { debug } from 'debug'
import { Entity, PrimaryKeyType, PRIMARY_KEY } from '../glossary'
import { compileQuery } from './compileQuery'
import {
  BulkQueryOptions,
  QuerySelector,
  WeakQuerySelector,
} from './queryTypes'
import * as iteratorUtils from '../utils/iteratorUtils'
import { paginateResults } from './paginateResults'
import { Database } from '../db/Database'
import { sortResults } from './sortResults'
import { invariant } from 'outvariant'
import { safeStringify } from '../utils/safeStringify'

const log = debug('executeQuery')

function queryByPrimaryKey(
  records: Map<PrimaryKeyType, Entity<any, any>>,
  query: QuerySelector<any>,
) {
  log('querying by primary key')
  log('query by primary key', { query, records })

  const matchPrimaryKey = compileQuery(query)

  const result = iteratorUtils.filter((id, value) => {
    const primaryKey = value[PRIMARY_KEY]

    invariant(
      primaryKey,
      'Failed to query by primary key using "%j": record (%j) has no primary key set.',
      query,
      value,
    )

    return matchPrimaryKey({ [primaryKey]: id })
  }, records)

  log('result of querying by primary key:', result)
  return result
}

/**
 * Execute a given query against a model in the database.
 * Returns the list of records that satisfy the query.
 */
export function executeQuery(
  modelName: string,
  primaryKey: PrimaryKeyType,
  query: WeakQuerySelector<any> & BulkQueryOptions<any>,
  db: Database<any>,
): Entity<any, any>[] {
  log(`${safeStringify(query)} on "${modelName}"`)
  log('using primary key "%s"', primaryKey)

  const records = db.getModel(modelName)

  // Reduce the query scope if there's a query by primary key of the model.
  const { [primaryKey]: primaryKeyComparator, ...restQueries } =
    query.where || {}
  log('primary key query', primaryKeyComparator)

  const scopedRecords = primaryKeyComparator
    ? queryByPrimaryKey(records, {
        where: { [primaryKey]: primaryKeyComparator },
      })
    : records

  const result = iteratorUtils.filter((_, record) => {
    const executeQuery = compileQuery({ where: restQueries })
    return executeQuery(record)
  }, scopedRecords)

  const resultJson = Array.from(result.values())

  log(
    `resolved query "${safeStringify(query)}" on "${modelName}" to`,
    resultJson,
  )

  if (query.orderBy) {
    sortResults(query.orderBy, resultJson)
  }

  const paginatedResults = paginateResults(query, resultJson)
  log('paginated query results', paginatedResults)

  return paginatedResults
}
