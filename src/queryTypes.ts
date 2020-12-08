export interface QuerySelector<EntityType extends Record<string, any>> {
  which: {
    [P in keyof EntityType]?: Partial<GetQueryFor<EntityType[P]>>
  }
}

export type GetQueryFor<T extends string | number | any[]> = T extends string
  ? StringQuery
  : T extends number
  ? NumberQuery
  : T extends Array<infer U>
  ? QuerySelector<U>['which']
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
