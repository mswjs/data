import { QuerySelector } from './query/queryTypes'

export type BaseTypes = string | number | boolean | Date
export type KeyType = string | number | symbol

export enum RelationKind {
  OneOf = 'oneOf',
  ManyOf = 'manyOf',
}

export interface RelationalNode<ModelName extends string> {
  kind: RelationKind
  modelName: string
  nodes: Array<InternalEntityProperties<ModelName>>
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
  Dictionary extends Record<string, any>,
  ModelName extends keyof Dictionary
> = InternalEntityProperties<ModelName> &
  Value<Dictionary[ModelName], Dictionary>

export type ModelDictionary<T> = Record<string, Record<string, any>> & Limit<T>

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
  ModelName extends keyof Dictionary
> {
  /**
   * Create a single entity for the model.
   */
  create(
    initialValues?: Partial<Value<Dictionary[ModelName], Dictionary>>,
  ): EntityInstance<Dictionary, ModelName>
  /**
   * Return the total number of entities.
   */
  count(): number
  /**
   * Find a first entity matching the query.
   */
  findFirst(
    query: QuerySelector<Value<Dictionary[ModelName], Dictionary>>,
  ): EntityInstance<Dictionary, ModelName>
  /**
   * Find multiple entities.
   */
  findMany(
    query: QuerySelector<Value<Dictionary[ModelName], Dictionary>>,
  ): EntityInstance<Dictionary, ModelName>[]
  /**
   * Return all entities of the current model.
   */
  getAll(): EntityInstance<Dictionary, ModelName>[]
  /**
   * Update a single entity with the next data.
   */
  update(
    query: QuerySelector<Value<Dictionary[ModelName], Dictionary>> & {
      data: Partial<Value<Dictionary[ModelName], Dictionary>>
    },
  ): EntityInstance<Dictionary, ModelName>
  /**
   * Update many entities with the next data.
   */
  updateMany(
    query: QuerySelector<Value<Dictionary[K], Dictionary>> & {
      data: Partial<UpdateManyValue<Dictionary[K], Dictionary>>
    },
  ): Value<Dictionary[K], Dictionary>[]
  /**
   * Delete a single entity.
   */
  delete(
    query: QuerySelector<Value<Dictionary[ModelName], Dictionary>>,
  ): EntityInstance<Dictionary, ModelName>
  /**
   * Delete multiple entities.
   */
  deleteMany(
    query: QuerySelector<Value<Dictionary[ModelName], Dictionary>>,
  ): EntityInstance<Dictionary, ModelName>[]
}

export type UpdateManyValue<
  T extends Record<string, any>,
  Parent extends Record<string, any>
> =
  | Value<T, Parent>
  | {
      [K in keyof T]: (currentValue: ReturnType<T[K]>) => ReturnType<T[K]>
    }

export type Value<
  T extends Record<string, any>,
  Parent extends Record<string, any>
> = {
  [K in keyof T]: T[K] extends OneOf<any>
    ? EntityInstance<Parent, T[K]['modelName']>
    : T[K] extends ManyOf<any>
    ? EntityInstance<Parent, T[K]['modelName']>[]
    : ReturnType<T[K]>
}

export type Database<EntityType> = Record<KeyType, EntityType[]>
