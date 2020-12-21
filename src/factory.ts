import { mergeDeepRight } from 'ramda'
import {
  FactoryAPI,
  Database,
  OneOf,
  ManyOf,
  ModelAPI,
  BaseTypes,
  EntityInstance,
  ModelDictionary,
  Value,
} from './glossary'
import { first } from './utils/first'
import { executeQuery } from './query/executeQuery'
import { compileQuery } from './query/compileQuery'
import { parseModelDeclaration } from './model/parseModelDeclaration'
import { createModel } from './model/createModel'

/**
 * Create a database with the given models.
 */
export function factory<Dictionary extends ModelDictionary>(
  dict: Dictionary,
): FactoryAPI<Dictionary> {
  const db: Database<EntityInstance<any, any>> = Object.keys(dict).reduce(
    (acc, modelName) => {
      acc[modelName] = []
      return acc
    },
    {},
  )

  return Object.entries(dict).reduce<any>((acc, [modelName, props]) => {
    acc[modelName] = createModelApi<Dictionary, typeof modelName>(
      modelName,
      props,
      db,
    )
    return acc
  }, {})
}

function createModelApi<
  Dictionary extends ModelDictionary,
  ModelName extends string
>(
  modelName: ModelName,
  declaration: Record<string, (() => BaseTypes) | OneOf<any> | ManyOf<any>>,
  db: Database<EntityInstance<Dictionary, ModelName>>,
): ModelAPI<Dictionary, ModelName> {
  return {
    create(initialValues = {}) {
      const { properties, relations } = parseModelDeclaration<
        Dictionary,
        ModelName
      >(modelName, declaration, initialValues)
      const model = createModel<Dictionary, ModelName>(
        modelName,
        properties,
        relations,
        db,
      )

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
      const executeQuery = compileQuery(query)
      const prevRecords = db[modelName]
      let nextRecord: EntityInstance<Dictionary, ModelName>

      for (let index = 0; index < prevRecords.length; index++) {
        const record = prevRecords[index]

        if (executeQuery(record)) {
          nextRecord = mergeDeepRight<
            EntityInstance<Dictionary, ModelName>,
            any
          >(record, query.data)
          db[modelName].splice(index, -1, nextRecord)
          break
        }
      }

      return nextRecord
    },
    updateMany(query) {
      const executeQuery = compileQuery(query)
      const prevRecords = db[modelName]

      const { updatedRecords, nextRecords } = prevRecords.reduce(
        (acc, record) => {
          if (executeQuery(record)) {
            const evaluatedData = Object.entries(query.data).reduce(
              (acc, [property, propertyValue]) => {
                const nextValue =
                  typeof propertyValue === 'function'
                    ? propertyValue(record[property])
                    : propertyValue
                acc[property] = nextValue
                return acc
              },
              {},
            )

            const nextRecord = mergeDeepRight<
              EntityInstance<Dictionary, ModelName>,
              any
            >(record, evaluatedData)
            acc.updatedRecords.push(nextRecord)
            acc.nextRecords.push(nextRecord)
          } else {
            acc.nextRecords.push(record)
          }

          return acc
        },
        { updatedRecords: [], nextRecords: [] },
      )

      db[modelName] = nextRecords

      return updatedRecords
    },
    delete(query) {
      let deletedRecord: EntityInstance<Dictionary, ModelName>
      const executeQuery = compileQuery(query)
      const prevRecords = db[modelName]

      for (let index = 0; index < prevRecords.length; index++) {
        const record = prevRecords[index]

        if (executeQuery(record)) {
          deletedRecord = record
          db[modelName].splice(index, 1)
          break
        }
      }

      return deletedRecord
    },
    deleteMany(query) {
      const executeQuery = compileQuery(query)
      const prevRecords = db[modelName]
      const { deletedRecords, nextRecords } = prevRecords.reduce<{
        deletedRecords: EntityInstance<Dictionary, ModelName>[]
        nextRecords: EntityInstance<Dictionary, ModelName>[]
      }>(
        (acc, record) => {
          if (executeQuery(record)) {
            acc.deletedRecords.push(record)
          } else {
            acc.nextRecords.push(record)
          }
          return acc
        },
        { deletedRecords: [], nextRecords: [] },
      )

      db[modelName] = nextRecords

      return deletedRecords
    },
  }
}
