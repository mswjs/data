import { QuerySelector } from './queryTypes'

export type BaseTypes = string | number | boolean
export type KeyType = string | number | symbol

export enum RelationKind {
  OneOf = 'oneOf',
  ManyOf = 'manyOf',
}

export interface RelationalNode {
  kind: RelationKind
  modelName: string
  nodes: Array<InternalEntityProperties<any>>
}

export type OneOf<T extends KeyType> = {
  __type: RelationKind.OneOf
  modelName: T
}
export type ManyOf<T extends KeyType> = {
  __type: RelationKind.ManyOf
  modelName: T
}

export type FactoryAPI<Dictionary extends Record<string, any>> = {
  [K in keyof Dictionary]: ModelAPI<Dictionary, K>
}

export interface InternalEntityProperties<ModelName extends KeyType> {
  readonly __type: ModelName
  readonly __nodeId: string
}

export type EntityInstance<
  T extends Record<string, any>,
  K extends keyof T
> = InternalEntityProperties<K> & Value<T[K], T>

export type Limit<T extends Record<string, any>> = {
  [RK in keyof T]: {
    [SK in keyof T[RK]]: T[RK][SK] extends
      | (() => BaseTypes)
      | OneOf<keyof T>
      | ManyOf<keyof T>
      ? T[RK][SK]
      : {
          error: 'expected a value or a relation'
          oneOf: keyof T
        }
  }
}

export interface ModelAPI<
  Dictionary extends Record<string, any>,
  K extends keyof Dictionary
> {
  /**
   * Create a single entity for the model.
   */
  create(
    initialValues?: Partial<Value<Dictionary[K], Dictionary>>
  ): EntityInstance<Dictionary, K>
  /**
   * Create multiple entities for the model.
   */
  many(count?: number): Value<Dictionary[K], Dictionary>[]
  /**
   * Return the total number of entities.
   */
  count(): number
  /**
   * Find a single entity.
   */
  findOne(
    query: QuerySelector<Value<Dictionary[K], Dictionary>>
  ): Value<Dictionary[K], Dictionary>
  /**
   * Find multiple entities.
   */
  findMany(
    query: QuerySelector<Value<Dictionary[K], Dictionary>>
  ): Value<Dictionary[K], Dictionary>[]
  /**
   * Update a single entity with the next data.
   */
  update(
    query: QuerySelector<Value<Dictionary[K], Dictionary>> & {
      data: Partial<Value<Dictionary[K], Dictionary>>
    }
  ): Value<Dictionary[K], Dictionary>
  /**
   * Delete a single entity.
   */
  delete(
    query: QuerySelector<Value<Dictionary[K], Dictionary>>
  ): Value<Dictionary[K], Dictionary>
}

export type Value<
  T extends Record<string, any>,
  Parent extends Record<string, any>
> = {
  [K in keyof T]: T[K] extends OneOf<any>
    ? Value<Parent[T[K]['modelName']], Parent>
    : T[K] extends ManyOf<any>
    ? Value<Parent[T[K]['modelName']], Parent>[]
    : ReturnType<T[K]>
}

export type Database<EntityType> = Record<KeyType, EntityType[]>
