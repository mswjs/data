import { EntityInstance } from '../glossary'
import { BulkQueryOptions, QuerySelector } from './queryTypes'

export function paginateResults(
  query: QuerySelector<any> & BulkQueryOptions,
  data: EntityInstance<any, any>[],
): EntityInstance<any, any>[] {
  const start = query.skip || 0
  const end = query.take ? start + query.take : undefined

  return data.slice(start, end)
}
