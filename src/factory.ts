import { mergeDeepRight } from 'ramda'
import { v4 } from 'uuid'
import {
  FactoryAPI,
  Value,
  Limit,
  Database,
  ModelAPI,
  ModelDeclaration,
} from './glossary'
import { first } from './utils/first'
import { primaryKey } from './utils/primaryKey'
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
  const db = Object.keys(dict).reduce<Database<Value<T, T>>>(
    (acc, modelName) => {
      acc[modelName] = new Map()
      return acc
    },
    {},
  )

  return Object.entries(dict).reduce<any>((acc, [modelName, props]) => {
    acc[modelName] = createModelApi(modelName, props, db)
    return acc
  }, {})
}

function getPrimaryKey(
  modelName: string,
  modelDeclaration: ModelDeclaration,
): string {
  const primaryKey = Object.entries(modelDeclaration).reduce<string>(
    (primaryKey, [key, value]) => {
      if ('primaryKey' in value && value.primaryKey) {
        if (primaryKey) {
          throw new Error(
            `You cannot specify more than one key for model "${modelName}"`,
          )
        }

        return key
      }

      return primaryKey
    },
    null,
  )

  if (!primaryKey) {
    throw new Error(
      `The model "${modelName}" doesn't have a primary key. You can add it using the util function \`primaryKey\`

import { factory, primaryKey } from '@mswjs/data'

const db = factory({
  user: {
    id: primaryKey(random.uuid),
  },
})`,
    )
  }

  return primaryKey
}

function createModelApi<ModelName extends string>(
  modelName: ModelName,
  modelDeclaration: ModelDeclaration,
  db: Database<any>,
): ModelAPI<any, any> {
  const key = getPrimaryKey(modelName, modelDeclaration)
  if (!(key in modelDeclaration)) {
    modelDeclaration[key] = primaryKey(v4)
  }
  return {
    create(initialValues = {}) {
      const { properties, relations } = parseModelDeclaration(
        modelName,
        modelDeclaration,
        initialValues,
      )
      const model = createModel(modelName, properties, relations, db)

      if (db[modelName].has(model[key])) {
        throw new Error(
          `Failed to create a "${modelName}" entity with the primary key "${key}": an entity with such key already exists.`,
        )
      }

      db[modelName].set(model[key], model)
      return model
    },
    count() {
      return db[modelName].size
    },
    findFirst(query) {
      const results = executeQuery(modelName, key, query, db)
      return first(results)
    },
    findMany(query) {
      return executeQuery(modelName, key, query, db)
    },
    getAll() {
      return Array.from(db[modelName].values())
    },
    update(query) {
      const entities = executeQuery(modelName, key, query, db, 1)

      if (entities.length) {
        const entity = entities[0]
        const nextEntity = mergeDeepRight(entity, query.data)
        if (nextEntity[key] !== entity[key]) {
          if (nextEntity[key] && db[modelName].has(nextEntity[key])) {
            throw new Error(
              `There is already an entity with the key ${nextEntity[key]}.`,
            )
          }
          db[modelName].delete(entity[key])
        }
        db[modelName].set(nextEntity[key], nextEntity)

        return nextEntity
      }
    },
    delete(query) {
      const entities = executeQuery(modelName, key, query, db, 1)
      if (entities.length) {
        const deletedRecord = entities[0]
        db[modelName].delete(deletedRecord[key])

        return deletedRecord
      }
    },
    deleteMany(query) {
      const deletedRecords = executeQuery(modelName, key, query, db)
      deletedRecords.forEach((record) => db[modelName].delete(record[key]))

      return deletedRecords
    },
  }
}
