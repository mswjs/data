import { GraphQLSchema } from 'graphql'
import { GraphQLHandler, RestHandler } from 'msw'
import { PrimaryKey } from './primaryKey'
import {
  BulkQueryOptions,
  QuerySelector,
  WeakQuerySelector,
} from './query/queryTypes'
import { OneOf, ManyOf } from './relations/Relation'

export type KeyType = string | number | symbol
export type AnyObject = Record<KeyType, any>
export type PrimaryKeyType = string | number
export type PrimitiveValueType = string | number | boolean | Date
export type ModelValueType = PrimitiveValueType | PrimitiveValueType[]
export type ModelValueTypeGetter = () => ModelValueType

/**
 * Minimal representation of an entity to look it up
 * in the database and resolve upon reference.
 */
export type RelationRef<ModelName extends string> =
  InternalEntityProperties<ModelName> & {
    [InternalEntityProperty.nodeId]: PrimaryKeyType
  }

export type ModelDefinition = Record<string, ModelDefinitionValue>

export type ModelDefinitionValue =
  | ModelValueTypeGetter
  | PrimaryKey<any>
  | OneOf<any>
  | ManyOf<any>
  | NestedModelDefinition

export type NestedModelDefinition = {
  [propertyName: string]:
    | ModelValueTypeGetter
    | OneOf<any>
    | ManyOf<any>
    | NestedModelDefinition
}

export type FactoryAPI<Dictionary extends Record<string, any>> = {
  [ModelName in keyof Dictionary]: ModelAPI<Dictionary, ModelName>
}

export type ModelDictionary = Record<KeyType, Limit<ModelDefinition>>

export type Limit<Definition extends ModelDefinition> = {
  [Key in keyof Definition]: Definition[Key] extends ModelDefinitionValue
    ? Definition[Key]
    : {
        error: 'expected primary key, initial value, or relation'
      }
}

export enum InternalEntityProperty {
  type = '__type',
  nodeId = '__nodeId',
  primaryKey = '__primaryKey',
}

export interface InternalEntityProperties<ModelName extends KeyType> {
  readonly [InternalEntityProperty.type]: ModelName
  readonly [InternalEntityProperty.primaryKey]: PrimaryKeyType
}

export type Entity<
  Dictionary extends ModelDictionary,
  ModelName extends keyof Dictionary,
> = Value<Dictionary[ModelName], Dictionary>

export type InternalEntity<
  Dictionary extends ModelDictionary,
  ModelName extends keyof Dictionary,
> = InternalEntityProperties<ModelName> & Entity<Dictionary, ModelName>

export type RequiredExactlyOne<
  ObjectType,
  KeysType extends keyof ObjectType = keyof ObjectType,
> = {
  [Key in KeysType]: Required<Pick<ObjectType, Key>> &
    Partial<Record<Exclude<KeysType, Key>, never>>
}[KeysType] &
  Pick<ObjectType, Exclude<keyof ObjectType, KeysType>>

export type DeepRequiredExactlyOne<Target extends AnyObject> =
  RequiredExactlyOne<{
    [Key in keyof Target]: Target[Key] extends AnyObject
      ? DeepRequiredExactlyOne<Target[Key]>
      : Target[Key]
  }>

export type InitialValues<
  Dictionary extends ModelDictionary,
  ModelName extends keyof Dictionary,
> = Partial<Value<Dictionary[ModelName], Dictionary>>

export interface ModelAPI<
  Dictionary extends ModelDictionary,
  ModelName extends keyof Dictionary,
> {
  /**
   * Create a single entity for the model.
   */
  create(
    initialValues?: InitialValues<Dictionary, ModelName>,
  ): Entity<Dictionary, ModelName>
  /**
   * Return the total number of entities.
   */
  count(query?: QuerySelector<InitialValues<Dictionary, ModelName>>): number
  /**
   * Find a first entity matching the query.
   */
  findFirst(
    query: QuerySelector<InitialValues<Dictionary, ModelName>>,
  ): Entity<Dictionary, ModelName> | null
  /**
   * Find multiple entities.
   */
  findMany(
    query: WeakQuerySelector<InitialValues<Dictionary, ModelName>> &
      BulkQueryOptions<InitialValues<Dictionary, ModelName>>,
  ): Entity<Dictionary, ModelName>[]
  /**
   * Return all entities of the current model.
   */
  getAll(): Entity<Dictionary, ModelName>[]
  /**
   * Update a single entity with the next data.
   */
  update(
    query: QuerySelector<InitialValues<Dictionary, ModelName>> & {
      data: Partial<UpdateManyValue<Dictionary[ModelName], Dictionary>>
    },
  ): Entity<Dictionary, ModelName> | null
  /**
   * Update many entities with the next data.
   */
  updateMany(
    query: QuerySelector<InitialValues<Dictionary, ModelName>> & {
      data: Partial<UpdateManyValue<Dictionary[ModelName], Dictionary>>
    },
  ): Entity<Dictionary, ModelName>[] | null
  /**
   * Delete a single entity.
   */
  delete(
    query: QuerySelector<InitialValues<Dictionary, ModelName>>,
  ): Entity<Dictionary, ModelName> | null
  /**
   * Delete multiple entities.
   */
  deleteMany(
    query: QuerySelector<InitialValues<Dictionary, ModelName>>,
  ): Entity<Dictionary, ModelName>[] | null
  /**
   * Generate request handlers of the given type based on the model definition.
   */
  toHandlers(type: 'rest', baseUrl?: string): RestHandler[]
  /**
   * Generate request handlers of the given type based on the model definition.
   */
  toHandlers(type: 'graphql', baseUrl?: string): GraphQLHandler[]

  /**
   * Generate a graphql schema based on the model definition.
   */
  toGraphQLSchema(): GraphQLSchema
}

export type UpdateManyValue<
  Target extends AnyObject,
  Dictionary extends ModelDictionary,
  ModelRoot extends AnyObject = Target,
> =
  | Value<Target, Dictionary>
  | {
      [Key in keyof Target]: Target[Key] extends PrimaryKey
        ? (
            prevValue: ReturnType<Target[Key]['getValue']>,
            entity: Value<Target, Dictionary>,
          ) => ReturnType<Target[Key]['getValue']>
        : Target[Key] extends ModelValueTypeGetter
        ? (
            prevValue: ReturnType<Target[Key]>,
            entity: Value<ModelRoot, Dictionary>,
          ) => ReturnType<Target[Key]>
        : Target[Key] extends AnyObject
        ? Partial<UpdateManyValue<Target[Key], Target, ModelRoot>>
        : (
            prevValue: ReturnType<Target[Key]>,
            entity: Value<Target, Dictionary>,
          ) => ReturnType<Target[Key]>
    }

export type Value<
  Target extends AnyObject,
  Dictionary extends ModelDictionary,
> = {
  [Key in keyof Target]: Target[Key] extends PrimaryKey<any>
    ? ReturnType<Target[Key]['getValue']>
    : // Extract value type from relations.
    Target[Key] extends OneOf<infer ModelName>
    ? Entity<Dictionary, ModelName>
    : Target[Key] extends ManyOf<infer ModelName>
    ? Entity<Dictionary, ModelName>[]
    : // Account for primitive value getters because
    // native constructors (i.e. StringConstructor) satisfy
    // the "AnyObject" predicate below.
    Target[Key] extends ModelValueTypeGetter
    ? ReturnType<Target[Key]>
    : // Handle nested objects.
    Target[Key] extends AnyObject
    ? Partial<Value<Target[Key], Target>>
    : // Otherwise, return the return type of primitive value getters.
      ReturnType<Target[Key]>
}
