import {
  AnyObject,
  DeepRequiredExactlyOne,
  PrimaryKeyType,
  Value,
  ModelValueType,
  ModelDefinitionValue,
} from '../glossary'

export interface QueryOptions {
  strict?: boolean
}
export interface QuerySelector<EntityType extends AnyObject> {
  where: QuerySelectorWhere<EntityType>
}

export type WeakQuerySelector<EntityType extends AnyObject> = Partial<
  QuerySelector<EntityType>
>

export type RecursiveQuerySelectorWhere<Value extends ModelValueType> =
  Value extends Array<infer ItemType>
    ? Partial<GetQueryFor<ItemType>>
    : Value extends ModelValueType
    ? Partial<GetQueryFor<Value>>
    : Value extends AnyObject
    ? {
        [K in keyof Value]?: RecursiveQuerySelectorWhere<Value[K]>
      }
    : never

export type QuerySelectorWhere<EntityType extends AnyObject> = {
  [Key in keyof EntityType]?: RecursiveQuerySelectorWhere<EntityType[Key]>
}

export interface WeakQuerySelectorWhere<KeyType extends PrimaryKeyType> {
  [key: string]: Partial<GetQueryFor<KeyType>>
}

export type SortDirection = 'asc' | 'desc'

export type RecursiveOrderBy<Value extends ModelDefinitionValue> =
  Value extends ModelValueType
    ? SortDirection
    : Value extends AnyObject
    ? DeepRequiredExactlyOne<{
        [K in keyof Value]?: RecursiveOrderBy<Value[K]>
      }>
    : never

export type OrderBy<EntityType extends AnyObject> = DeepRequiredExactlyOne<{
  [Key in keyof EntityType]?: RecursiveOrderBy<EntityType[Key]>
}>

export interface BulkQueryBaseOptions<EntityType extends AnyObject> {
  take?: number
  orderBy?: OrderBy<EntityType> | OrderBy<EntityType>[]
}

interface BulkQueryOffsetOptions<EntityType extends AnyObject>
  extends BulkQueryBaseOptions<EntityType> {
  skip?: number
  cursor?: never
}

interface BulkQueryCursorOptions<EntityType extends AnyObject>
  extends BulkQueryBaseOptions<EntityType> {
  skip?: never
  cursor: PrimaryKeyType | null
}

export type BulkQueryOptions<EntityType extends AnyObject> =
  | BulkQueryOffsetOptions<EntityType>
  | BulkQueryCursorOptions<EntityType>

export type ComparatorFn<ExpectedType extends any, ActualType extends any> = (
  expected: ExpectedType,
  actual: ActualType,
) => boolean

export type QueryToComparator<
  QueryType extends StringQuery | NumberQuery | BooleanQuery | DateQuery,
> = {
  [Key in keyof QueryType]: ComparatorFn<
    QueryType[Key],
    QueryType[Key] extends Array<infer ValueType> ? ValueType : QueryType[Key]
  >
}

export type GetQueryFor<ValueType extends any> = ValueType extends string
  ? StringQuery
  : ValueType extends number
  ? NumberQuery
  : ValueType extends Boolean
  ? BooleanQuery
  : ValueType extends Date
  ? DateQuery
  : ValueType extends Array<infer ItemType extends AnyObject>
  ? QuerySelector<ItemType>['where']
  : /**
   * Relational `oneOf`/`manyOf` invocation
   * resolves to the `Value` type.
   */
  ValueType extends Value<any, any>
  ? QuerySelector<ValueType>['where']
  : never

export interface StringQuery {
  equals: string
  notEquals: string
  contains: string
  notContains: string
  gt: string
  gte: string
  lt: string
  lte: string
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
  in: number[]
  notIn: number[]
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
