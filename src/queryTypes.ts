import { Value, OneOf } from './factory'

export interface QuerySelector<EntityType extends Record<string, any>> {
  which: {
    [K in keyof EntityType]?: Partial<GetQueryFor<EntityType[K]>>
  }
}

export type GetQueryFor<
  T extends string | number | any[] | OneOf<any>
> = T extends string
  ? StringQuery
  : T extends number
  ? NumberQuery
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
}

export interface NumberQuery {
  equals: number
  notEquals: number
  gt: number
  gte: number
  lt: number
  lte: number
}
