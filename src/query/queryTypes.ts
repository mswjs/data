import { Value } from '../glossary'

export interface QuerySelector<EntityType extends Record<string, any>> {
  which: {
    [K in keyof EntityType]?: Partial<GetQueryFor<EntityType[K]>>
  }
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
