import { PrimaryKeyType, Value } from '../glossary'

export interface QuerySelector<EntityType extends Record<string, any>> {
  strict?: boolean
  which: QuerySelectorWhich<EntityType>
}

export type QuerySelectorWhich<EntityType extends Record<string, any>> = {
  [K in keyof EntityType]?: Partial<GetQueryFor<EntityType[K]>>
}

interface BulkQueryBaseOptions {
  take?: number
}

interface BulkQueryOffsetOptions extends BulkQueryBaseOptions {
  skip?: number
  cursor?: never
}

interface BulkQueryCursorOptions extends BulkQueryBaseOptions {
  skip?: never
  cursor: PrimaryKeyType | null
}

export type BulkQueryOptions = BulkQueryOffsetOptions | BulkQueryCursorOptions

export type ComparatorFn<ExpectedType extends any, ActualType extends any> = (
  expected: ExpectedType,
  actual: ActualType,
) => boolean

export type QueryToComparator<
  QueryType extends StringQuery | NumberQuery | BooleanQuery | DateQuery
> = {
  [K in keyof QueryType]: ComparatorFn<
    QueryType[K],
    QueryType[K] extends Array<infer T> ? T : QueryType[K]
  >
}

export type GetQueryFor<
  T extends string | number | boolean | any[]
> = T extends string
  ? StringQuery
  : T extends number
  ? NumberQuery
  : T extends Boolean
  ? BooleanQuery
  : T extends Date
  ? DateQuery
  : T extends Array<infer U>
  ? QuerySelector<U>['which']
  : /**
   * Relational `oneOf`/`manyOf` invocation
   * resolves to the `Value` type.
   */
  T extends Value<any, any>
  ? QuerySelector<T>['which']
  : never

export interface StringQuery {
  equals: string
  notEquals: string
  contains: string
  notContains: string
  in: string[]
  notIn: string[]
}

export interface NumberQuery {
  equals: number
  notEquals: number
  between: [number, number]
  notBetween: [number, number]
  gt: number
  gte: number
  lt: number
  lte: number
}

export interface BooleanQuery {
  equals: boolean
  notEquals: boolean
}

export interface DateQuery {
  equals: Date
  notEquals: Date
  gt: Date
  gte: Date
  lt: Date
  lte: Date
}
