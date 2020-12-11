import { debug } from 'debug'
import { Database } from '../glossary'
import { compileQuery } from './compileQuery'
import { QuerySelector } from '../queryTypes'
import { invariant } from '../utils/invariant'

const log = debug('executeQuery')

/**
 * Execute a given query against a model in the database.
 * Returns the list of results.
 */
export function executeQuery(
  modelName: string,
  query: QuerySelector<any>,
  db: Database<any>,
) {
  log(`${JSON.stringify(query)} on "${modelName}"`)
  const records = db[modelName]

  invariant(
    records.length === 0,
    `Failed to execute query on the "${modelName}" model: unknown database model.`,
  )

  const result = records.filter(compileQuery(query))
  log(`resolved query "${JSON.stringify(query)}" on "${modelName}" to`, result)

  return result
}
