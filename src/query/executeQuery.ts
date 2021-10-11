import { debug } from 'debug'
import {
  InternalEntity,
  InternalEntityProperty,
  PrimaryKeyType,
} from '../glossary'
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

const log = debug('executeQuery')

function queryByPrimaryKey(
  records: Map<PrimaryKeyType, InternalEntity<any, any>>,
  query: QuerySelector<any>,
) {
  log('querying by primary key')
  const matchPrimaryKey = compileQuery(query)

  return iteratorUtils.filter((id, value) => {
    return matchPrimaryKey({
      [value[InternalEntityProperty.primaryKey]]: id,
    })
  }, records)
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
): InternalEntity<any, any>[] {
  log(`${JSON.stringify(query)} on "${modelName}"`)
  log('using primary key "%s"', primaryKey)

  const records = db.getModel(modelName)

  // Reduce the query scope if there's a query by primary key of the model.
  const { [primaryKey]: primaryKeyComparator, ...restQueries } =
    query.where || {}
  log('primary key query', primaryKeyComparator)

  const scopedRecords = primaryKeyComparator
    ? queryByPrimaryKey(db.getModel(modelName), {
        where: { [primaryKey]: primaryKeyComparator },
      })
    : records

  const result = iteratorUtils.filter((_, record) => {
    const executeQuery = compileQuery({ where: restQueries })
    return executeQuery(record)
  }, scopedRecords)

  const resultJson = Array.from(result.values())

  log(
    `resolved query "${JSON.stringify(query)}" on "${modelName}" to`,
    resultJson,
  )

  if (query.orderBy) {
    sortResults(query.orderBy, resultJson)
  }

  const paginatedResults = paginateResults(query, resultJson)
  log('paginated query results', paginatedResults)

  return paginatedResults
}
