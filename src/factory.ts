import { v4 } from 'uuid'
import { debug, log } from 'debug'
import { QuerySelector } from './queryTypes'
import { getComparatorsForValue } from './utils/comparators'
import { first } from './utils/first'
import { invariant } from './utils/invariant'

type BaseTypes = string | number | boolean
export type KeyType = string | number | symbol

export type OneOf<T extends KeyType> = {
  __type: 'oneOf'
  modelName: T
}
type ManyOf<T extends KeyType> = {
  __type: 'manyOf'
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

function evolve<P extends Record<KeyType, any>>(
  props: P,
  by: (value: any, key: string) => any
) {
  return Object.entries(props).reduce((acc, [key, value]) => {
    acc[key] = by(value, key)
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

interface RelationalNode extends InternalEntityProperties<any> {
  modelName: string
}

function defineRelationalProperties(
  obj: Record<string, any>,
  relations: Record<string, RelationalNode>,
  db: Database<any>
): void {
  const log = debug('relationalProperty')

  const properties = Object.entries(relations).reduce(
    (acc, [property, relation]) => {
      acc[property] = {
        get() {
          log(`get "${property}"`, relation)

          /**
           * @todo Depending on `oneOf`/`manyOf` relation type
           * allow or forbid an array of values.
           */
          const refResults = executeQuery(
            relation.__type,
            {
              which: {
                __nodeId: {
                  equals: relation.__nodeId,
                },
              },
            },
            db
          )

          log(`resolved "${property}" to`, refResults)

          return first(refResults)
        },
      }

      return acc
    },
    {}
  )

  Object.defineProperties(obj, properties)
}

function evaluateModelDeclaration(
  modelName: string,
  declaration: Record<string, any>,
  initialValues?: Record<string, any>
): {
  properties: Record<string, any>
  relations: Record<string, RelationalNode>
} {
  return Object.entries(declaration).reduce(
    (acc, [key, valueOrRelationRef]) => {
      const initialValue = initialValues[key]

      if (initialValue) {
        if (initialValue.__nodeId) {
          const relation: RelationalNode = initialValue
          acc.relations[key] = {
            modelName: key,
            __type: relation.__type,
            __nodeId: relation.__nodeId,
          }

          return acc
        }

        /**
         * @todo Handle `oneOf` invocation as the value of the model
         * property declaration.
         */
        if (['oneOf'].includes(initialValue.__type)) {
          return acc
        }

        acc.properties[key] = initialValue
        return acc
      }

      acc.properties[key] = valueOrRelationRef()
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
    update: () => null,
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
    __type: 'oneOf',
    modelName,
  }
}

declare function manyOf<T extends string>(name: T): ManyOf<T>
