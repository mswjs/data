import { InternalEntity, InternalEntityProperty } from '../glossary'
import { BulkQueryOptions, WeakQuerySelector } from './queryTypes'

function getEndIndex(start: number, end?: number) {
  return end ? start + end : undefined
}

export function paginateResults(
  query: WeakQuerySelector<any> & BulkQueryOptions<any>,
  data: InternalEntity<any, any>[],
): InternalEntity<any, any>[] {
  if (query.cursor) {
    const cursorIndex = data.findIndex((entity) => {
      return entity[entity[InternalEntityProperty.primaryKey]] === query.cursor
    })

    if (cursorIndex === -1) {
      return []
    }

    return data.slice(cursorIndex + 1, getEndIndex(cursorIndex + 1, query.take))
  }

  const start = query.skip || 0
  return data.slice(start, getEndIndex(start, query.take))
}
