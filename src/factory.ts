import {
  FactoryAPI,
  Database,
  ModelAPI,
  ModelDeclaration,
  EntityInstance,
  ModelDictionary,
  PrimaryKeyType,
} from './glossary'
import { first } from './utils/first'
import { executeQuery } from './query/executeQuery'
import { parseModelDeclaration } from './model/parseModelDeclaration'
import { createModel } from './model/createModel'
import { invariant } from './utils/invariant'
import { updateEntity } from './model/updateEntity'
import { DuplicateKeyError } from './exceptions'

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
  let modelPrimaryKey: PrimaryKeyType

  const api: ModelAPI<Dictionary, ModelName> = {
    create(initialValues = {}) {
      const { primaryKey, properties, relations } = parseModelDeclaration<
        Dictionary,
        ModelName
      >(modelName, declaration, initialValues)

      const entity = createModel<Dictionary, ModelName>(
        modelName,
        primaryKey,
        properties,
        relations,
        db,
      )
      modelPrimaryKey = entity.__primaryKey
      const entityPrimaryKey = entity[entity.__primaryKey] as string

      // Prevent creation of multiple entities with the same primary key value.
      invariant(
        db[modelName].has(entityPrimaryKey),
        `Failed to create "${modelName}": entity with the primary key "${entityPrimaryKey}" ("${entity.__primaryKey}") already exists.`,
      )

      db[modelName].set(entityPrimaryKey as string, entity)

      return entity
    },
    count() {
      return db[modelName].size
    },
    findFirst(query) {
      const results = executeQuery(modelName, modelPrimaryKey, query, db)
      const firstResult = first(results)

      invariant(
        query.strict && !firstResult,
        `Failed to execute "findFirst" on the "${modelName}" model: no entity found matching the query "${JSON.stringify(
          query.which,
        )}".`,
      )

      return firstResult
    },
    findMany(query) {
      const results = executeQuery(modelName, modelPrimaryKey, query, db)

      invariant(
        query.strict && results.length === 0,
        `Failed to execute "findMany" on the "${modelName}" model: no entities found matching the query "${JSON.stringify(
          query.which,
        )}".`,
      )

      return results
    },
    getAll() {
      return Array.from(db[modelName].values())
    },
    update({ strict, ...query }) {
      const record = api.findFirst(query)

      if (!record) {
        invariant(
          strict,
          `Failed to execute "update" on the "${modelName}" model: no entity found matching the query "${JSON.stringify(
            query.which,
          )}".`,
        )

        return null
      }

      const nextRecord = updateEntity(record, query.data)

      if (nextRecord[record.__primaryKey] !== record[record.__primaryKey]) {
        invariant(
          db[modelName].has(nextRecord[record.__primaryKey]),
          () =>
            new DuplicateKeyError(modelName, nextRecord[record.__primaryKey]),
        )
        db[modelName].delete(record[record.__primaryKey] as string)
      }

      db[modelName].set(nextRecord[record.__primaryKey] as string, nextRecord)

      return nextRecord
    },
    updateMany({ strict, ...query }) {
      const records = api.findMany(query)
      const updatedRecords = []

      if (records.length === 0) {
        invariant(
          strict,
          `Failed to execute "updateMany" on the "${modelName}" model: no entities found matching the query "${JSON.stringify(
            query.which,
          )}".`,
        )

        return null
      }

      records.forEach((record) => {
        const nextRecord = updateEntity(record, query.data)

        if (nextRecord[record.__primaryKey] !== record[record.__primaryKey]) {
          invariant(
            db[modelName].has(nextRecord[record.__primaryKey]),
            () =>
              new DuplicateKeyError(modelName, nextRecord[record.__primaryKey]),
          )
          db[modelName].delete(record[record.__primaryKey] as string)
        }

        db[modelName].set(nextRecord[record.__primaryKey] as string, nextRecord)
        updatedRecords.push(nextRecord)
      })

      return updatedRecords
    },
    delete({ strict, ...query }) {
      const record = api.findFirst(query)

      if (!record) {
        invariant(
          strict,
          `Failed to execute "delete" on the "user" model: no entity found matching the query "${JSON.stringify(
            query.which,
          )}".`,
        )

        return null
      }

      db[modelName].delete(record[record.__primaryKey] as string)
      return record
    },
    deleteMany({ strict, ...query }) {
      const records = api.findMany(query)

      if (records.length === 0) {
        invariant(
          strict,
          `Failed to execute "deleteMany" on the "user" model: no entities found matching the query "${JSON.stringify(
            query.which,
          )}".`,
        )

        return []
      }

      records.forEach((record) => {
        db[modelName].delete(record[record.__primaryKey] as string)
      })

      return records
    },
  }

  return api
}
