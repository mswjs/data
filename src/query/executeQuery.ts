import { debug } from 'debug'
import { InternalEntity } from '../glossary'
import { compileQuery } from './compileQuery'
import {
  BulkQueryOptions,
  QuerySelector,
  WeakQuerySelector,
} from './queryTypes'
import * as iteratorUtils from '../utils/iteratorUtils'
import { paginateResults } from './paginateResults'
import { Database } from '../db/Database'

const log = debug('executeQuery')

function queryByPrimaryKey(
  records: Map<string, InternalEntity<any, any>>,
  query: QuerySelector<any>,
) {
  log('querying by primary key')
  const matchPrimaryKey = compileQuery(query)

  return iteratorUtils.filter((id, value) => {
    return matchPrimaryKey({
      [value.__primaryKey]: id,
    })
  }, records)
}

/**
 * Execute a given query against a model in the database.
 * Returns the list of records that satisfy the query.
 */
export function executeQuery(
  modelName: string,
  primaryKey: string,
  query: WeakQuerySelector<any> & BulkQueryOptions,
  db: Database<any>,
): InternalEntity<any, any>[] {
  log(`${JSON.stringify(query)} on "${modelName}"`)
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

  const paginatedResults = paginateResults(query, resultJson)
  log('paginated query results', paginatedResults)

  return paginatedResults
}
