import type { StandardSchemaV1 } from '@standard-schema/spec'
import { get } from 'es-toolkit/compat'
import { toDeepEntries, type PropertyPath } from '#/src/utils.js'

export type SortDirection = 'asc' | 'desc'

export interface SortOptions<Schema extends StandardSchemaV1> {
  orderBy?: OrderBy<Schema>
}

type OrderBy<Schema extends StandardSchemaV1> =
  | OrderByCriteria<Schema>
  | Array<OrderByCriteria<Schema>>

type OrderByCriteria<
  Schema extends StandardSchemaV1,
  T = StandardSchemaV1.InferOutput<Schema>,
> =
  NonNullable<T> extends Array<infer V>
    ? OrderByCriteria<Schema, V>
    : NonNullable<T> extends Record<any, any>
      ? {
          [K in keyof T]?: OrderByCriteria<Schema, T[K]>
        }
      : SortDirection

export function sortResults<Schema extends StandardSchemaV1>(
  sortOptions: SortOptions<Schema>,
  data: Array<StandardSchemaV1.InferOutput<Schema>>,
): void {
  if (sortOptions.orderBy == null) {
    return
  }

  const criteria: Array<[PropertyPath, SortDirection]> = Array.isArray(
    sortOptions.orderBy,
  )
    ? sortOptions.orderBy.flatMap((entry) => {
        return toDeepEntries<SortDirection>(entry as any)
      })
    : toDeepEntries<SortDirection>(sortOptions.orderBy as any)

  data.sort((left, right) => {
    for (const [path, sortDirection] of criteria) {
      const leftValue = get(left, path)
      const rightValue = get(right, path)

      if (leftValue > rightValue) {
        return sortDirection === 'asc' ? 1 : -1
      }

      if (leftValue < rightValue) {
        return sortDirection === 'asc' ? -1 : 1
      }
    }

    return 0
  })
}
