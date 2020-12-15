import { mergeDeepRight } from 'ramda'
import {
  FactoryAPI,
  Value,
  Limit,
  Database,
  OneOf,
  ManyOf,
  ModelAPI,
  BaseTypes,
} from './glossary'
import { first } from './utils/first'
import { executeQuery } from './query/executeQuery'
import { compileQuery } from './query/compileQuery'
import { parseModelDeclaration } from './model/parseModelDeclaration'
import { createModel } from './model/createModel'

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
    {},
  )

  return Object.entries(dict).reduce<any>((acc, [modelName, props]) => {
    acc[modelName] = createModelApi(modelName, props, db)
    return acc
  }, {})
}

function createModelApi<ModelName extends string>(
  modelName: ModelName,
  declaration: Record<string, (() => BaseTypes) | OneOf<any> | ManyOf<any>>,
  db: Database<any>,
): ModelAPI<any, any> {
  return {
    create(initialValues = {}) {
      const { properties, relations } = parseModelDeclaration(
        modelName,
        declaration,
        initialValues,
      )
      const model = createModel(modelName, properties, relations, db)

      db[modelName].push(model)
      return model
    },
    count() {
      return db[modelName].length
    },
    findFirst(query) {
      const results = executeQuery(modelName, query, db)
      return first(results)
    },
    findMany(query) {
      return executeQuery(modelName, query, db)
    },
    getAll() {
      return Object.values(db[modelName])
    },
    update(query) {
      let nextEntity: any
      const executeQuery = compileQuery(query)
      const prevRecords = db[modelName]

      for (let index = 0; index < prevRecords.length; index++) {
        const entity = prevRecords[index]

        if (executeQuery(entity)) {
          nextEntity = mergeDeepRight(entity, query.data)
          db[modelName].splice(index, -1, nextEntity)
          break
        }
      }

      return nextEntity
    },
    updateMany(query) {
      let nextEntity: any
      const executeQuery = compileQuery(query)
      const prevRecords = db[modelName]

      const { updatedEntities, entities } = prevRecords.reduce(
        (acc, entity) => {
          if (executeQuery(entity)) {
            const evaluatedData = Object.entries(query.data).reduce<
              typeof entity
            >((acc, [property, propertyValue]) => {
              if (typeof propertyValue === 'function') {
                acc[property] = propertyValue(entity[property])
              } else {
                acc[property] = propertyValue
              }
              return acc
            }, {})
            nextEntity = mergeDeepRight(entity, evaluatedData)
            acc.updatedEntities.push(nextEntity)
            acc.entities.push(nextEntity)
          } else {
            acc.entities.push(entity)
          }

          return acc
        },
        { updatedEntities: [], entities: [] },
      )

      db[modelName] = entities

      return updatedEntities
    },
    delete(query) {
      let deletedEntity: any
      const executeQuery = compileQuery(query)
      const prevRecords = db[modelName]

      for (let index = 0; index < prevRecords.length; index++) {
        const entity = prevRecords[index]

        if (executeQuery(entity)) {
          deletedEntity = entity
          db[modelName].splice(index, 1)
          break
        }
      }

      return deletedEntity
    },
    deleteMany(query) {
      const executeQuery = compileQuery(query)
      const prevRecords = db[modelName]
      const { deletedRecords, newRecords } = prevRecords.reduce(
        (acc, entity) => {
          if (executeQuery(entity)) {
            acc.deletedRecords.push(entity)
          } else {
            acc.newRecords.push(entity)
          }
          return acc
        },
        { deletedRecords: [], newRecords: [] },
      )

      db[modelName] = newRecords

      return deletedRecords
    },
  }
}
