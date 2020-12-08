import { QuerySelector } from './queryTypes'
import { getComparatorsForValue } from './utils/comparators'

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
          error: 'expected BaseType or'
          oneOf: keyof T
        }
  }
}

type FactoryAPI<T extends Record<string, any>> = {
  [K in keyof T]: ModelAPI<T, K>
}

interface ModelAPI<T extends Record<string, any>, K extends keyof T> {
  /**
   * Creates a single entity for the model.
   */
  create(initialValues?: Partial<Value<T[K], T>>): Value<T[K], T>
  /**
   * Creates multiple entities for the model.
   */
  many(count?: number): Value<T[K], T>[]
  /**
   * Returns the total number of entities.
   */
  count(): number
  /**
   * Finds a single entity.
   */
  findOne(query: QuerySelector<Value<T[K], T>>): Value<T[K], T>
  /**
   * Finds multiple entities.
   */
  findMany(query: QuerySelector<Value<T[K], T>>): Value<T[K], T>[]
  /**
   * Updates a single entity with the next data.
   */
  update(
    query: QuerySelector<Value<T[K], T>> & { data: Partial<Value<T[K], T>> }
  ): Value<T[K], T>
  /**
   * Deletes a single entity.
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

function compileQuery(query: QuerySelector<any>) {
  return (entity: any) => {
    return Object.entries(query.which)
      .map<boolean>(([propName, queryChunk], index) => {
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

function executeQuery(
  query: QuerySelector<any>,
  modelName: string,
  db: Database<any>
) {
  const records = db[modelName]
  return records.filter(compileQuery(query))
}

function createModelApi(
  modelName: string,
  props: Record<string, any> /** @todo */,
  db: Database<any>
): ModelAPI<any, any> {
  return {
    create(initialValues = {}) {
      const newModel = evolve(
        props,
        (getter, key) => initialValues[key] ?? getter()
      )
      db[modelName].push(newModel)
      return newModel
    },
    many: () => null,
    count() {
      return db[modelName].length
    },
    findOne(query) {
      const results = executeQuery(query, modelName, db)
      return results?.length > 0 ? results[0] : null
    },
    findMany(query) {
      return executeQuery(query, modelName, db)
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

declare function oneOf<T extends string>(name: T): OneOf<T>
declare function manyOf<T extends string>(name: T): ManyOf<T>
