import {
  FactoryAPI,
  Database,
  ModelAPI,
  ModelDeclaration,
  EntityInstance,
  ModelDictionary,
} from './glossary'
import { first } from './utils/first'
import { executeQuery } from './query/executeQuery'
import { parseModelDeclaration } from './model/parseModelDeclaration'
import { createModel } from './model/createModel'
import { invariant } from './utils/invariant'
import { updateEntity } from './model/updateEntity'

/**
 * Create a database with the given models.
 */
export function factory<Dictionary extends ModelDictionary>(
  dict: Dictionary,
): FactoryAPI<Dictionary> {
  const db: Database = Object.keys(dict).reduce((acc, modelName) => {
    acc[modelName] = new Map<string, EntityInstance<Dictionary, string>>()
    return acc
  }, {})

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
>(modelName: ModelName, declaration: ModelDeclaration, db: Database) {
  const api: ModelAPI<Dictionary, ModelName> = {
    create(initialValues = {}) {
      const { primaryKey, properties, relations } = parseModelDeclaration<
        Dictionary,
        ModelName
      >(modelName, declaration, initialValues)

      const model = createModel<Dictionary, ModelName>(
        modelName,
        primaryKey,
        properties,
        relations,
        db,
      )
      const modelPrimaryKey = model[model.__primaryKey]

      // Prevent creation of multiple entities with the same primary key value.
      invariant(
        db[modelName].has(modelPrimaryKey as string),
        `Failed to create "${modelName}": entity with the primary key "${modelPrimaryKey}" ("${model.__primaryKey}") already exists.`,
      )

      db[modelName].set(modelPrimaryKey as string, model)

      return model
    },
    count() {
      return db[modelName].size
    },
    findFirst(query) {
      const results = executeQuery(modelName, 'PRIMARY_KEY', query, db)
      return first(results)
    },
    findMany(query) {
      return executeQuery(modelName, 'PRIMARY_KEY', query, db)
    },
    getAll() {
      return Array.from(db[modelName].values())
    },
    update(query) {
      const record = api.findFirst(query)

      if (!record) {
        return null
      }

      const nextRecord = updateEntity(record, query.data)

      db[modelName].set(record[record.__primaryKey] as string, nextRecord)

      return nextRecord
    },
    updateMany(query) {
      const records = api.findMany(query)
      const updatedRecords = []

      if (!records) {
        return null
      }

      records.forEach((record) => {
        const nextRecord = updateEntity(record, query.data)
        db[modelName].set(record[record.__primaryKey] as string, nextRecord)
        updatedRecords.push(nextRecord)
      })

      return updatedRecords
    },
    delete(query) {
      const record = api.findFirst(query)

      if (!record) {
        return null
      }

      db[modelName].delete(record[record.__primaryKey] as string)
      return record
    },
    deleteMany(query) {
      const records = api.findMany(query)

      if (!records) {
        return null
      }

      records.forEach((record) => {
        db[modelName].delete(record[record.__primaryKey] as string)
      })

      return records
    },
  }

  return api
}
