import { GraphQLSchema } from 'graphql'
import { GraphQLHandler, RestHandler } from 'msw'
import {
  BulkQueryOptions,
  QuerySelector,
  WeakQuerySelector,
} from './query/queryTypes'

export type PrimaryKeyType = string | number
export type BaseTypes = string | number | boolean | Date
export type KeyType = string | number | symbol

export enum InternalEntityProperty {
  type = '__type',
  nodeId = '__nodeId',
  primaryKey = '__primaryKey',
}

export interface PrimaryKeyDeclaration<
  ValueType extends PrimaryKeyType = string
> {
  isPrimaryKey: boolean
  getValue(): ValueType
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
  unique: boolean
  modelName: ModelName
}

export interface Relation {
  kind: RelationKind
  modelName: string
  unique: boolean
  primaryKey: PrimaryKeyType
}

/**
 * Minimal representation of an entity to look it up
 * in the database and resolve upon reference.
 */
export type RelationRef<
  ModelName extends string
> = InternalEntityProperties<ModelName> & {
  [InternalEntityProperty.nodeId]: PrimaryKeyType
}

export interface RelationOptions {
  unique: boolean
}

export type OneOf<ModelName extends KeyType> = RelationDefinition<
  RelationKind.OneOf,
  ModelName
>

export type ManyOf<ModelName extends KeyType> = RelationDefinition<
  RelationKind.ManyOf,
  ModelName
>

export type ModelDefinition = Record<
  string,
  (() => BaseTypes) | OneOf<any> | ManyOf<any> | PrimaryKeyDeclaration
>

export type FactoryAPI<Dictionary extends Record<string, any>> = {
  [K in keyof Dictionary]: ModelAPI<Dictionary, K>
}

export interface InternalEntityProperties<ModelName extends KeyType> {
  readonly [InternalEntityProperty.type]: ModelName
  readonly [InternalEntityProperty.primaryKey]: PrimaryKeyType
}

export type Entity<
  Dictionary extends Record<string, any>,
  ModelName extends keyof Dictionary
> = Value<Dictionary[ModelName], Dictionary>

export type InternalEntity<
  Dictionary extends Record<string, any>,
  ModelName extends keyof Dictionary
> = InternalEntityProperties<ModelName> & Entity<Dictionary, ModelName>

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
  ): Entity<Dictionary, ModelName>
  /**
   * Return the total number of entities.
   */
  count(query?: QuerySelector<Value<Dictionary[ModelName], Dictionary>>): number
  /**
   * Find a first entity matching the query.
   */
  findFirst(
    query: QuerySelector<Value<Dictionary[ModelName], Dictionary>>,
  ): Entity<Dictionary, ModelName> | null
  /**
   * Find multiple entities.
   */
  findMany(
    query: WeakQuerySelector<Value<Dictionary[ModelName], Dictionary>> &
      BulkQueryOptions,
  ): Entity<Dictionary, ModelName>[]
  /**
   * Return all entities of the current model.
   */
  getAll(): Entity<Dictionary, ModelName>[]
  /**
   * Update a single entity with the next data.
   */
  update(
    query: QuerySelector<Value<Dictionary[ModelName], Dictionary>> & {
      data: Partial<UpdateManyValue<Dictionary[ModelName], Dictionary>>
    },
  ): Entity<Dictionary, ModelName> | null
  /**
   * Update many entities with the next data.
   */
  updateMany(
    query: QuerySelector<Value<Dictionary[ModelName], Dictionary>> & {
      data: Partial<UpdateManyValue<Dictionary[ModelName], Dictionary>>
    },
  ): Entity<Dictionary, ModelName>[] | null
  /**
   * Delete a single entity.
   */
  delete(
    query: QuerySelector<Value<Dictionary[ModelName], Dictionary>>,
  ): Entity<Dictionary, ModelName> | null
  /**
   * Delete multiple entities.
   */
  deleteMany(
    query: QuerySelector<Value<Dictionary[ModelName], Dictionary>>,
  ): Entity<Dictionary, ModelName>[] | null
  /**
   * Generate request handlers of the given type based on the model.
   */
  toHandlers(type: 'rest', baseUrl?: string): RestHandler[]
  /**
   * Generate request handlers of the given type based on the model.
   */
  toHandlers(type: 'graphql', baseUrl?: string): GraphQLHandler[]

  /**
   * Generate a graphql schema based on the model.
   */
  toGraphQLSchema(): GraphQLSchema
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
            entity: Value<T, Parent>,
          ) => ReturnType<T[K]['getValue']>
        : (
            prevValue: ReturnType<T[K]>,
            entity: Value<T, Parent>,
          ) => ReturnType<T[K]>
    }

export type Value<
  T extends Record<string, any>,
  Parent extends Record<string, any>
> = {
  [K in keyof T]: T[K] extends OneOf<any>
    ? Entity<Parent, T[K]['modelName']>
    : T[K] extends ManyOf<any>
    ? Entity<Parent, T[K]['modelName']>[]
    : T[K] extends PrimaryKeyDeclaration
    ? ReturnType<T[K]['getValue']>
    : ReturnType<T[K]>
}
