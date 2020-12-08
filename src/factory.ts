import { v4 } from 'uuid'
import { QuerySelector } from './queryTypes'
import { getComparatorsForValue } from './utils/comparators'
import { invariant } from './utils/invariant'

type BaseTypes = string | number | boolean
type KeyType = string | number | symbol

type OneOf<T extends KeyType> = {
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

type FactoryAPI<T extends Record<string, any>> = {
  [K in keyof T]: ModelAPI<T, K>
}

interface EntityInternalProps<ModelName extends KeyType> {
  readonly __type: ModelName
  readonly __nodeId: string
}

type EntityInstance<
  T extends Record<string, any>,
  K extends keyof T
> = EntityInternalProps<K> & Value<T[K], T>

interface ModelAPI<T extends Record<string, any>, K extends keyof T> {
  /**
   * Create a single entity for the model.
   */
  create(initialValues?: Partial<Value<T[K], T>>): EntityInstance<T, K>
  /**
   * Create multiple entities for the model.
   */
  many(count?: number): Value<T[K], T>[]
  /**
   * Return the total number of entities.
   */
  count(): number
  /**
   * Find a single entity.
   */
  findOne(query: QuerySelector<Value<T[K], T>>): Value<T[K], T>
  /**
   * Find multiple entities.
   */
  findMany(query: QuerySelector<Value<T[K], T>>): Value<T[K], T>[]
  /**
   * Update a single entity with the next data.
   */
  update(
    query: QuerySelector<Value<T[K], T>> & { data: Partial<Value<T[K], T>> }
  ): Value<T[K], T>
  /**
   * Delete a single entity.
   */
  delete(query: QuerySelector<Value<T[K], T>>): Value<T[K], T>
}

type Value<
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
  return (entity: any) => {
    return Object.entries(query.which)
      .map<boolean>(([propName, queryChunk]) => {
        const actualValue = entity[propName]
        const comparatorSet = getComparatorsForValue(actualValue)
        return Object.entries(queryChunk).reduce<boolean>(
          (acc, [comparatorName, expectedValue]) => {
            if (!acc) {
              return acc
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
  const records = db[modelName]

  invariant(
    records.length === 0,
    `Failed to execute query on the "${modelName}" model: unknown database model.`
  )

  return records.filter(compileQuery(query))
}

function createRelation(
  modelName: string,
  relatedModelName: string,
  db: Database<any>
) {
  console.log('referencing relation', relatedModelName, 'from', modelName, db)
}

function createModelApi<ModelName extends string>(
  modelName: ModelName,
  props: Record<string, any> /** @todo */,
  db: Database<any>
): ModelAPI<any, any> {
  return {
    create(initialValues = {}) {
      const internalProps: EntityInternalProps<ModelName> = {
        __type: modelName,
        __nodeId: v4(),
      }
      const referencedProps = []

      const newModel: EntityInstance<any, any> = Object.assign(
        {},
        evolve(props, (getter, key) => {
          const initialValue = initialValues[key]

          if (initialValue) {
            if (initialValue.__nodeId) {
              referencedProps.push({
                modelName: key,
                node: initialValue,
              })
              return null
            }

            return initialValue
          }

          // Resolve `oneOf`/`manyOf` as the factory model value.
          if (['oneOf'].includes(getter.__type)) {
            return createRelation(modelName, getter.modelName, db)
          }

          return getter()
        }),
        internalProps
      )

      // Attach relational entities, if present.
      if (referencedProps.length > 0) {
        const referenceProperties = referencedProps.reduce(
          (acc, { modelName, node }) => {
            acc[modelName] = {
              get() {
                /**
                 * @todo Depending on `oneOf`/`manyOf` relation type
                 * allow or forbid an array of values.
                 */
                const refResults = executeQuery(
                  modelName,
                  {
                    which: {
                      __nodeId: {
                        equals: node.__nodeId,
                      },
                    },
                  },
                  db
                )

                return refResults.length > 0 ? refResults[0] : null
              },
            }
            return acc
          },
          {}
        )

        Object.defineProperties(newModel, referenceProperties)
      }

      db[modelName].push(newModel)
      return newModel
    },
    many: () => null,
    count() {
      return db[modelName].length
    },
    findOne(query) {
      const results = executeQuery(modelName, query, db)
      return results?.length > 0 ? results[0] : null
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
