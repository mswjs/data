import type { StandardSchemaV1 } from '@standard-schema/spec'
import { get } from 'lodash-es'
import { toDeepEntries } from '#/src/utils.js'

export type SortDirection = 'asc' | 'desc'

export interface SortOptions<Schema extends StandardSchemaV1> {
  orderBy?: OrderBy<Schema>
}

type OrderBy<
  Schema extends StandardSchemaV1,
  T = StandardSchemaV1.InferOutput<Schema>,
> =
  NonNullable<T> extends Array<infer V>
    ? OrderBy<Schema, V>
    : NonNullable<T> extends Record<any, any>
      ? {
          [K in keyof T]?: OrderBy<Schema, T[K]>
        }
      : SortDirection

export function sortResults<Schema extends StandardSchemaV1>(
  sortOptions: SortOptions<Schema>,
  data: Array<StandardSchemaV1.InferOutput<Schema>>,
): void {
  if (sortOptions.orderBy == null) {
    return
  }

  const criteria = toDeepEntries<SortDirection>(sortOptions.orderBy as any)

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
