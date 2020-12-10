import { v4 } from 'uuid'
import { debug } from 'debug'
import { mergeDeepRight } from 'ramda'
import { QuerySelector } from './queryTypes'
import { getComparatorsForValue } from './utils/comparators'
import { first } from './utils/first'
import { invariant } from './utils/invariant'

type BaseTypes = string | number | boolean
export type KeyType = string | number | symbol
enum RelationKind {
  OneOf = 'oneOf',
  ManyOf = 'manyOf',
}

export type OneOf<T extends KeyType> = {
  __type: RelationKind.OneOf
  modelName: T
}
type ManyOf<T extends KeyType> = {
  __type: RelationKind.ManyOf
  modelName: T
}

type Limit<T extends Record<string, any>> = {
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

type FactoryAPI<Dictionary extends Record<string, any>> = {
  [K in keyof Dictionary]: ModelAPI<Dictionary, K>
}

interface InternalEntityProperties<ModelName extends KeyType> {
  readonly __type: ModelName
  readonly __nodeId: string
}

type EntityInstance<
  T extends Record<string, any>,
  K extends keyof T
> = InternalEntityProperties<K> & Value<T[K], T>

interface ModelAPI<
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

type Database<EntityType> = Record<KeyType, EntityType[]>

/**
 * Create a database models factory.
 */
export function factory<
  T extends Record<string, Record<string, any>> & Limit<T>
>(dict: T): FactoryAPI<T> {
  const db: Database<Value<T, T>> = Object.keys(dict).reduce(
    (acc, modelName) => {
      acc[modelName] = []
      return acc
    },
    {}
  )

  return Object.entries(dict).reduce<any>((acc, [modelName, props]) => {
    acc[modelName] = createModelApi(modelName, props, db)
    return acc
  }, {})
}

/**
 * Compile a query expression into a function that accepts an actual entity
 * and returns a query execution result (whether the entity satisfies the query).
 */
function compileQuery(query: QuerySelector<any>) {
  const log = debug('compileQuery')
  log(JSON.stringify(query))

  return (entity: any) => {
    return Object.entries(query.which)
      .map<boolean>(([propName, queryChunk]) => {
        const actualValue = entity[propName]
        const comparatorSet = getComparatorsForValue(actualValue)

        log({ queryChunk, actualValue })

        return Object.entries(queryChunk).reduce<boolean>(
          (acc, [comparatorName, expectedValue]) => {
            if (!acc) {
              return acc
            }

            // When the actual value is a resolved relational property reference,
            // execute the current query chunk on it.
            if (actualValue.__type) {
              return compileQuery({ which: queryChunk })(actualValue)
            }

            const comparatorFn = comparatorSet[comparatorName]
            const hasMatch = comparatorFn(expectedValue, actualValue)

            return hasMatch
          },
          true
        )
      })
      .every(Boolean)
  }
}

/**
 * Execute a given query against a model in the database.
 * Returns the list of results.
 */
function executeQuery(
  modelName: string,
  query: QuerySelector<any>,
  db: Database<any>
) {
  const log = debug('executeQuery')
  log(`${JSON.stringify(query)} on "${modelName}"`)
  const records = db[modelName]

  invariant(
    records.length === 0,
    `Failed to execute query on the "${modelName}" model: unknown database model.`
  )

  const result = records.filter(compileQuery(query))
  log(`resolved query "${JSON.stringify(query)}" on "${modelName}" to`, result)

  return result
}

interface RelationalNode {
  kind: RelationKind
  modelName: string
  nodes: Array<InternalEntityProperties<any>>
}

function defineRelationalProperties(
  entity: Record<string, any>,
  relations: Record<string, RelationalNode>,
  db: Database<any>
): void {
  const log = debug('relationalProperty')

  const properties = Object.entries(relations).reduce(
    (acc, [property, relation]) => {
      acc[property] = {
        get() {
          log(`get "${property}"`, relation)

          const refResults = relation.nodes.reduce((acc, node) => {
            return acc.concat(
              executeQuery(
                node.__type,
                {
                  which: {
                    __nodeId: {
                      equals: node.__nodeId,
                    },
                  },
                },
                db
              )
            )
          }, [])

          log(`resolved "${relation.kind}" "${property}" to`, refResults)

          return relation.kind === RelationKind.OneOf
            ? first(refResults)
            : refResults
        },
      }

      return acc
    },
    {}
  )

  Object.defineProperties(entity, properties)
}

function evaluateModelDeclaration(
  modelName: string,
  declaration: Record<string, (() => BaseTypes) | OneOf<any> | ManyOf<any>>,
  initialValues?: Record<
    string,
    BaseTypes | EntityInstance<any, any> | undefined
  >
) {
  const log = debug('evaluateModelDeclaration')
  log(`create a "${modelName}" entity`, declaration, initialValues)

  return Object.entries(declaration).reduce<{
    properties: Record<string, any>
    relations: Record<string, RelationalNode>
  }>(
    (acc, [key, valueGetter]) => {
      const exactValue = initialValues?.[key]
      log(`initial value for key "${modelName}.${key}"`, exactValue)

      if (
        typeof exactValue === 'string' ||
        typeof exactValue === 'number' ||
        typeof exactValue === 'boolean'
      ) {
        log(
          `"${modelName}.${key}" has a plain initial value, setting to`,
          exactValue
        )

        acc.properties[key] = exactValue
        return acc
      }

      if (exactValue) {
        if (Array.isArray(exactValue)) {
          /**
           * @todo How to deal with an Array value if only certain members of that Array
           * are relational references?
           */
          acc.relations[key] = {
            kind: RelationKind.ManyOf,
            modelName: key,
            nodes: exactValue,
          }

          return acc
        }

        if ('__nodeId' in exactValue) {
          const relation = exactValue

          log(
            `initial value for "${modelName}.${key}" references "${relation.__type}" with id "${relation.__nodeId}"`
          )

          /**
           * @todo This must be set ONCE.
           * If the relation if `ManyOf`, this should equal to an array.
           */
          acc.relations[key] = {
            kind: RelationKind.OneOf,
            modelName: key,
            nodes: [
              {
                __type: relation.__type,
                __nodeId: relation.__nodeId,
              },
            ],
          }

          return acc
        }

        // A plain exact initial value is provided (not a relational property).
        acc[key] = exactValue
        return acc
      }

      if ('__type' in valueGetter) {
        throw new Error(
          `Failed to set "${modelName}.${key}" as its a relational property with no value.`
        )
      }

      log(
        `"${modelName}.${key}" has no initial value, seeding with`,
        valueGetter
      )

      // When initial value is not provided, use the value getter function
      // specified in the model declaration.
      acc.properties[key] = valueGetter()
      return acc
    },
    {
      properties: {},
      relations: {},
    }
  )
}

function createModel<ModelName extends string>(
  modelName: ModelName,
  properties: Record<string, any>,
  relations: Record<string, any>,
  db: Database<any>
) {
  const internalProperties: InternalEntityProperties<ModelName> = {
    __type: modelName,
    __nodeId: v4(),
  }
  const model = Object.assign({}, properties, internalProperties)
  defineRelationalProperties(model, relations, db)

  return model
}

function createModelApi<ModelName extends string>(
  modelName: ModelName,
  declaration: Record<string, any> /** @todo */,
  db: Database<any>
): ModelAPI<any, any> {
  return {
    create(initialValues = {}) {
      const { properties, relations } = evaluateModelDeclaration(
        modelName,
        declaration,
        initialValues
      )
      const model = createModel(modelName, properties, relations, db)

      db[modelName].push(model)
      return model
    },
    many: () => null,
    count() {
      return db[modelName].length
    },
    findOne(query) {
      const results = executeQuery(modelName, query, db)
      return first(results)
    },
    findMany(query) {
      return executeQuery(modelName, query, db)
    },
    update(query) {
      let nextEntity: any
      const executeQuery = compileQuery(query)
      const prevRecords = db[modelName]

      for (let i = 0; i < prevRecords.length; i++) {
        const entity = prevRecords[i]

        if (executeQuery(entity)) {
          nextEntity = mergeDeepRight(entity, query.data)
          db[modelName].splice(i, -1, nextEntity)
          break
        }
      }

      return nextEntity
    },
    delete(query) {
      let deletedEntity: any
      const executeQuery = compileQuery(query)
      const prevRecords = db[modelName]

      for (let i = 0; i < prevRecords.length; i++) {
        const entity = prevRecords[i]

        if (!executeQuery(entity)) {
          deletedEntity = entity
          db[modelName].splice(i, 1)
          break
        }
      }

      return deletedEntity
    },
  }
}

export function oneOf<T extends string>(modelName: T): OneOf<T> {
  return {
    __type: RelationKind.OneOf,
    modelName,
  }
}

export function manyOf<T extends string>(modelName: T): ManyOf<T> {
  return {
    __type: RelationKind.ManyOf,
    modelName,
  }
}
