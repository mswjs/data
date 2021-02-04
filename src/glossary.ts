import { BulkQueryOptions, QuerySelector } from './query/queryTypes'

export type PrimaryKeyType = string
export type BaseTypes = string | number | boolean | Date
export type KeyType = string | number | symbol

export interface PrimaryKeyDeclaration {
  isPrimaryKey: boolean
  getValue(): PrimaryKeyType
}

export enum RelationKind {
  OneOf = 'oneOf',
  ManyOf = 'manyOf',
}

/**
 * Definition of the relation.
 * @example factory({ user: { post: oneOf('post') } })
 */
export interface RelationDefinition<
  Kind extends RelationKind,
  ModelName extends KeyType
> {
  kind: Kind
  modelName: ModelName
}

export interface Relation<ModelName extends string> {
  kind: RelationKind
  modelName: string
  refs: RelationRef<ModelName>[]
}

/**
 * Minimal representation of an entity to look it up
 * in the database and resolve upon reference.
 */
export type RelationRef<
  ModelName extends string
> = InternalEntityProperties<ModelName> & {
  __nodeId: PrimaryKeyType
}

export type OneOf<ModelName extends KeyType> = RelationDefinition<
  RelationKind.OneOf,
  ModelName
>

export type ManyOf<ModelName extends KeyType> = RelationDefinition<
  RelationKind.ManyOf,
  ModelName
>

export type ModelDeclaration = Record<
  string,
  (() => BaseTypes) | OneOf<any> | ManyOf<any> | PrimaryKeyDeclaration
>

export type FactoryAPI<Dictionary extends Record<string, any>> = {
  [K in keyof Dictionary]: ModelAPI<Dictionary, K>
}

export interface InternalEntityProperties<ModelName extends KeyType> {
  readonly __type: ModelName
  readonly __primaryKey: PrimaryKeyType
}

export type EntityInstance<
  Dictionary extends Record<string, any>,
  ModelName extends keyof Dictionary
> = InternalEntityProperties<ModelName> &
  Value<Dictionary[ModelName], Dictionary>

export type ModelDictionary = Limit<Record<string, Record<string, any>>>

export type Limit<T extends Record<string, any>> = {
  [RK in keyof T]: {
    [SK in keyof T[RK]]: T[RK][SK] extends
      | (() => BaseTypes)
      | PrimaryKeyDeclaration
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
  Dictionary extends ModelDictionary,
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
  count(query?: QuerySelector<Value<Dictionary[ModelName], Dictionary>>): number
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
    query: QuerySelector<Value<Dictionary[ModelName], Dictionary>> &
      BulkQueryOptions,
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
    query: QuerySelector<Value<Dictionary[ModelName], Dictionary>> & {
      data: Partial<UpdateManyValue<Dictionary[ModelName], Dictionary>>
    },
  ): Value<Dictionary[ModelName], Dictionary>[]
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
      [K in keyof T]: T[K] extends PrimaryKeyDeclaration
        ? (
            prevValue: ReturnType<T[K]['getValue']>,
          ) => ReturnType<T[K]['getValue']>
        : (prevValue: ReturnType<T[K]>) => ReturnType<T[K]>
    }

export type Value<
  T extends Record<string, any>,
  Parent extends Record<string, any>
> = {
  [K in keyof T]: T[K] extends OneOf<any>
    ? EntityInstance<Parent, T[K]['modelName']>
    : T[K] extends ManyOf<any>
    ? EntityInstance<Parent, T[K]['modelName']>[]
    : T[K] extends PrimaryKeyDeclaration
    ? ReturnType<T[K]['getValue']>
    : ReturnType<T[K]>
}

export type Database = Record<KeyType, Map<string, EntityInstance<any, any>>>
