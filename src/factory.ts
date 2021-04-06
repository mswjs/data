import {
  FactoryAPI,
  ModelAPI,
  ModelDeclaration,
  ModelDictionary,
  PrimaryKeyType,
} from './glossary'
import { first } from './utils/first'
import { executeQuery } from './query/executeQuery'
import { parseModelDeclaration } from './model/parseModelDeclaration'
import { createModel } from './model/createModel'
import { invariant } from './utils/invariant'
import { updateEntity } from './model/updateEntity'
import { OperationError, OperationErrorType } from './errors/OperationError'
import { Database } from './db/Database'
import { applySyncMiddleware } from './middleware/applySyncMiddleware'
import { applyStorage } from './middleware/newMiddleware'

/**
 * Create a database with the given models.
 */
export function factory<Dictionary extends ModelDictionary>(
  dictionary: Dictionary,
): FactoryAPI<Dictionary> {
  const db = new Database<Dictionary>(dictionary)

  return Object.entries(dictionary).reduce<any>((acc, [modelName, props]) => {
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
  declaration: ModelDeclaration,
  db: Database<Dictionary>,
) {
  let modelPrimaryKey: PrimaryKeyType

  // Apply database middleware
  // applySyncMiddleware(db)
  applyStorage(db)

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
        db.has(modelName, entityPrimaryKey),
        `Failed to create "${modelName}": entity with the primary key "${entityPrimaryKey}" ("${entity.__primaryKey}") already exists.`,
        new OperationError(OperationErrorType.DuplicatePrimaryKey),
      )

      db.create(modelName, entity)

      return entity
    },
    count(query) {
      if (!query) {
        return db.count(modelName)
      }

      const results = executeQuery(modelName, modelPrimaryKey, query, db)
      return results.length
    },
    findFirst(query) {
      const results = executeQuery(modelName, modelPrimaryKey, query, db)
      const firstResult = first(results)

      invariant(
        query.strict && !firstResult,
        `Failed to execute "findFirst" on the "${modelName}" model: no entity found matching the query "${JSON.stringify(
          query.which,
        )}".`,
        new OperationError(OperationErrorType.EntityNotFound),
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
        new OperationError(OperationErrorType.EntityNotFound),
      )

      return results
    },
    getAll() {
      return db.listEntities(modelName)
    },
    update({ strict, ...query }) {
      const prevRecord = api.findFirst(query)

      if (!prevRecord) {
        invariant(
          strict,
          `Failed to execute "update" on the "${modelName}" model: no entity found matching the query "${JSON.stringify(
            query.which,
          )}".`,
          new OperationError(OperationErrorType.EntityNotFound),
        )

        return null
      }

      const nextRecord = updateEntity(prevRecord, query.data)

      if (
        nextRecord[prevRecord.__primaryKey] !==
        prevRecord[prevRecord.__primaryKey]
      ) {
        invariant(
          db.has(modelName, nextRecord[prevRecord.__primaryKey]),
          `Failed to execute "update" on the "${modelName}" model: the entity with a primary key "${
            nextRecord[prevRecord.__primaryKey]
          }" ("${modelPrimaryKey}") already exists.`,
          new OperationError(OperationErrorType.DuplicatePrimaryKey),
        )
      }

      db.update(modelName, nextRecord, prevRecord)

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
          new OperationError(OperationErrorType.EntityNotFound),
        )

        return null
      }

      records.forEach((prevRecord) => {
        const nextRecord = updateEntity(prevRecord, query.data)

        if (
          nextRecord[prevRecord.__primaryKey] !==
          prevRecord[prevRecord.__primaryKey]
        ) {
          invariant(
            db.has(modelName, nextRecord[prevRecord.__primaryKey]),
            `Failed to execute "updateMany" on the "${modelName}" model: no entities found matching the query "${JSON.stringify(
              query.which,
            )}".`,
            new OperationError(OperationErrorType.EntityNotFound),
          )
        }

        db.update(modelName, nextRecord, prevRecord)

        updatedRecords.push(nextRecord)
      })

      return updatedRecords
    },
    delete({ strict, ...query }) {
      const record = api.findFirst(query)

      if (!record) {
        invariant(
          strict,
          `Failed to execute "delete" on the "${modelName}" model: no entity found matching the query "${JSON.stringify(
            query.which,
          )}".`,
          new OperationError(OperationErrorType.EntityNotFound),
        )

        return null
      }

      db.delete(modelName, record[record.__primaryKey] as string)
      return record
    },
    deleteMany({ strict, ...query }) {
      const records = api.findMany(query)

      if (records.length === 0) {
        invariant(
          strict,
          `Failed to execute "deleteMany" on the "${modelName}" model: no entities found matching the query "${JSON.stringify(
            query.which,
          )}".`,
          new OperationError(OperationErrorType.EntityNotFound),
        )

        return []
      }

      records.forEach((record) => {
        db.delete(modelName, record[record.__primaryKey] as string)
      })

      return records
    },
  }

  return api
}
