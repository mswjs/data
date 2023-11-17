import { GraphQLSchema } from 'graphql'
import { GraphQLHandler, HttpHandler } from 'msw'
import { Database } from './db/Database'
import { NullableObject, NullableProperty } from './nullable'
import { PrimaryKey } from './primaryKey'
import {
  BulkQueryOptions,
  QueryOptions,
  QuerySelector,
  WeakQuerySelector,
} from './query/queryTypes'
import { OneOf, ManyOf } from './relations/Relation'

export const PRIMARY_KEY = Symbol('primaryKey')
export const ENTITY_TYPE = Symbol('type')
export const DATABASE_INSTANCE = Symbol('databaseInstance')

export type KeyType = string | number | symbol
export type AnyObject = Record<KeyType, any>
export type PrimaryKeyType = string | number
export type PrimitiveValueType = string | number | boolean | Date
export type ModelValueType = PrimitiveValueType | PrimitiveValueType[]
export type ModelValueTypeGetter = () => ModelValueType

export type ModelDefinition = Record<string, ModelDefinitionValue>

export type ModelDefinitionValue =
  | PrimaryKey<any>
  | ModelValueTypeGetter
  | NullableProperty<any>
  | NullableObject<any>
  | OneOf<any, boolean>
  | ManyOf<any, boolean>
  | NestedModelDefinition

export type NestedModelDefinition = {
  [propertyName: string]:
    | ModelValueTypeGetter
    | NullableProperty<any>
    | NullableObject<any>
    | OneOf<any, boolean>
    | ManyOf<any, boolean>
    | NestedModelDefinition
}

export type FactoryAPI<Dictionary extends Record<string, any>> = {
  [ModelName in keyof Dictionary]: ModelAPI<Dictionary, ModelName>
} & {
  [DATABASE_INSTANCE]: Database<Dictionary>
}

export type ModelDictionary = Record<KeyType, Limit<ModelDefinition>>

export type Limit<Definition extends ModelDefinition> = {
  [Key in keyof Definition]: Definition[Key] extends ModelDefinitionValue
    ? Definition[Key]
    : {
        error: 'expected primary key, initial value, or relation'
      }
}

export interface InternalEntityProperties<ModelName extends KeyType> {
  readonly [ENTITY_TYPE]: ModelName
  readonly [PRIMARY_KEY]: PrimaryKeyType
}

export type Entity<
  Dictionary extends ModelDictionary,
  ModelName extends keyof Dictionary,
> = PublicEntity<Dictionary, ModelName> & InternalEntityProperties<ModelName>

export type PublicEntity<
  Dictionary extends ModelDictionary,
  ModelName extends keyof Dictionary,
> = Value<Dictionary[ModelName], Dictionary>

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

export type StrictQueryReturnType<
  Options extends QueryOptions,
  ValueType extends unknown,
> = Options['strict'] extends true ? ValueType : ValueType | null

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
  count(
    query?: QueryOptions & QuerySelector<InitialValues<Dictionary, ModelName>>,
  ): number
  /**
   * Find a first entity matching the query.
   */
  findFirst<Options extends QueryOptions>(
    query: Options & QuerySelector<InitialValues<Dictionary, ModelName>>,
  ): StrictQueryReturnType<Options, Entity<Dictionary, ModelName>>
  /**
   * Find multiple entities.
   */
  findMany(
    query: QueryOptions &
      WeakQuerySelector<InitialValues<Dictionary, ModelName>> &
      BulkQueryOptions<InitialValues<Dictionary, ModelName>>,
  ): Entity<Dictionary, ModelName>[]
  /**
   * Return all entities of the current model.
   */
  getAll(): Entity<Dictionary, ModelName>[]
  /**
   * Update a single entity with the next data.
   */
  update<Options extends QueryOptions>(
    query: Options &
      QuerySelector<InitialValues<Dictionary, ModelName>> & {
        data: Partial<UpdateManyValue<Dictionary[ModelName], Dictionary>>
      },
  ): StrictQueryReturnType<Options, Entity<Dictionary, ModelName>>
  /**
   * Update many entities with the next data.
   */
  updateMany<Options extends QueryOptions>(
    query: Options &
      QuerySelector<InitialValues<Dictionary, ModelName>> & {
        data: Partial<UpdateManyValue<Dictionary[ModelName], Dictionary>>
      },
  ): StrictQueryReturnType<Options, Entity<Dictionary, ModelName>[]>
  /**
   * Delete a single entity.
   */
  delete<Options extends QueryOptions>(
    query: Options & QuerySelector<InitialValues<Dictionary, ModelName>>,
  ): StrictQueryReturnType<Options, Entity<Dictionary, ModelName>>
  /**
   * Delete multiple entities.
   */
  deleteMany<Options extends QueryOptions>(
    query: Options & QuerySelector<InitialValues<Dictionary, ModelName>>,
  ): StrictQueryReturnType<Options, Entity<Dictionary, ModelName>[]>
  /**
   * Generate request handlers of the given type based on the model definition.
   */
  toHandlers(type: 'rest', baseUrl?: string): HttpHandler[]
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
      [Key in keyof Target]?: Target[Key] extends PrimaryKey
        ? (
            prevValue: ReturnType<Target[Key]['getPrimaryKeyValue']>,
            entity: Value<Target, Dictionary>,
          ) => ReturnType<Target[Key]['getPrimaryKeyValue']>
        : Target[Key] extends ModelValueTypeGetter
        ? (
            prevValue: ReturnType<Target[Key]>,
            entity: Value<ModelRoot, Dictionary>,
          ) => ReturnType<Target[Key]>
        : Target[Key] extends OneOf<infer ModelName>
        ? (
            prevValue: PublicEntity<Dictionary, ModelName>,
            entity: Value<Target, Dictionary>,
          ) => PublicEntity<Dictionary, ModelName>
        : Target[Key] extends ManyOf<infer ModelName>
        ? (
            prevValue: PublicEntity<Dictionary, ModelName>[],
            entity: Value<Target, Dictionary>,
          ) => PublicEntity<Dictionary, ModelName>[]
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
    ? ReturnType<Target[Key]['getPrimaryKeyValue']>
    : // Extract underlying value type of nullable properties
    Target[Key] extends NullableProperty<any>
    ? ReturnType<Target[Key]['getValue']>
    : Target[Key] extends NullableObject<any>
    ? Partial<Value<Target[Key]['objectDefinition'], Dictionary>> | null
    : // Extract value type from OneOf relations.
    Target[Key] extends OneOf<infer ModelName, infer Nullable>
    ? Nullable extends true
      ? PublicEntity<Dictionary, ModelName> | null
      : PublicEntity<Dictionary, ModelName> | undefined
    : // Extract value type from ManyOf relations.
    Target[Key] extends ManyOf<infer ModelName, infer Nullable>
    ? Nullable extends true
      ? PublicEntity<Dictionary, ModelName>[] | null
      : PublicEntity<Dictionary, ModelName>[]
    : // Account for primitive value getters because
    // native constructors (i.e. StringConstructor) satisfy
    // the "AnyObject" predicate below.
    Target[Key] extends ModelValueTypeGetter
    ? ReturnType<Target[Key]>
    : // Handle nested objects.
    Target[Key] extends AnyObject
    ? Partial<Value<Target[Key], Dictionary>>
    : // Otherwise, return the return type of primitive value getters.
      ReturnType<Target[Key]>
}
