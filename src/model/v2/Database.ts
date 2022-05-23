import md5 from 'md5'
import get from 'lodash/get'
import { invariant } from 'outvariant'
import { IDENTIFIER, MODEL_NAME } from './contexts/QueryableContext'
import {
  BulkQueryOptions,
  QuerySelector,
  WeakQuerySelector,
} from '../../query/queryTypes'
import { compileQuery } from '../../query/compileQuery'
import { sortResults } from '../../query/sortResults'
import { paginateResults } from '../../query/paginateResults'

let callOrder = 0

export class Database {
  public readonly id: string
  private records: Record<string, Record<string, any>>

  constructor() {
    callOrder++
    this.id = this.generateId()
    this.records = {}
  }

  private generateId(): string {
    const { stack } = new Error()
    const callFrame = stack?.split('\n')[4]
    const salt = `${callOrder}-${callFrame?.trim()}`
    return md5(salt)
  }

  public create(modelName: string, entity: any) {
    invariant(
      entity[MODEL_NAME],
      'Failed to add "%s" to the database: given entity has no model.',
      modelName,
    )

    invariant(
      entity[IDENTIFIER],
      'Failed to add "%s" to the database: given entity has no primary key.',
      modelName,
    )

    const idKey = entity[IDENTIFIER]
    const id = entity[idKey]

    // Each record must have a unique ID.
    invariant(
      !this.has(modelName, id),
      'Failed to create a new record for "%s": found existing record with the same ID (%s: "%s").',
      modelName,
      idKey,
      id,
    )

    this.upsertRecord(modelName, id, entity)
  }

  public has(modelName: string, id: string): boolean {
    return !!this.get(modelName, id)
  }

  public get(modelName: string, id?: string): any {
    return get(this.records, id ? [modelName, id] : [modelName])
  }

  public drop(modelName?: string): void {
    if (modelName) {
      delete this.records[modelName]
      return
    }

    this.records = {}
  }

  public query(
    modelName: string,
    idKey: string,
    query: WeakQuerySelector<any> & BulkQueryOptions<any>,
  ): any[] {
    const recordsByModel = this.get(modelName)

    if (!recordsByModel) {
      return []
    }

    const { [idKey]: idComparator, ...restQueries } = query.where || {}

    function queryThrough(
      query: QuerySelector<any>,
      records: Record<string, any>,
    ): any[] {
      const results: any[] = []
      const executeQuery = compileQuery(query)

      for (const record of Object.values(records)) {
        if (executeQuery(record as any)) {
          results.push(record)
        }
      }

      return results
    }

    // Narrow the scope of the query if there's a query
    // by the ID of the model present.
    const lens = idComparator
      ? queryThrough({ where: { [idKey]: idComparator } }, recordsByModel)
      : recordsByModel

    const results = queryThrough({ where: restQueries }, lens)

    if (query.orderBy) {
      sortResults(query.orderBy, results)
    }

    const paginatedResults = paginateResults(query, results)

    return paginatedResults
  }

  private upsertRecord(modelName: string, id: string, record: any): void {
    if (!this.records[modelName]) {
      this.records[modelName] = {}
    }

    this.records[modelName][id] = record
  }
}
