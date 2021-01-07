import { debug } from 'debug'
import { Database, EntityInstance } from '../glossary'
import { compileQuery } from './compileQuery'
import { BulkQueryOptions, QuerySelector } from './queryTypes'
import { invariant } from '../utils/invariant'
import * as iteratorUtils from '../utils/iteratorUtils'
import { paginateResults } from './paginateResults'

const log = debug('executeQuery')

function queryByPrimaryKey(
  records: Map<string, EntityInstance<any, any>>,
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
  query: QuerySelector<any> & BulkQueryOptions,
  db: Database,
): EntityInstance<any, any>[] {
  log(`${JSON.stringify(query)} on "${modelName}"`)
  const records = db[modelName]

  // Reduce the query scope if there's a query by primary key of the model.
  const { [primaryKey]: primaryKeyComparator, ...restQueries } = query.which
  log('primary key query', primaryKeyComparator)

  const scopedRecords = primaryKeyComparator
    ? queryByPrimaryKey(db[modelName], {
        which: { [primaryKey]: primaryKeyComparator },
      })
    : records

  const result = iteratorUtils.filter((_, record) => {
    const executeQuery = compileQuery({ which: restQueries })
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
