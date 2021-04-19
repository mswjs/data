import {
  EntityInstance,
  FactoryAPI,
  ModelAPI,
  ModelDefinition,
  ModelDictionary,
} from './glossary'
import { first } from './utils/first'
import { executeQuery } from './query/executeQuery'
import { parseModelDefinition } from './model/parseModelDefinition'
import { createModel } from './model/createModel'
import { invariant } from './utils/invariant'
import { updateEntity } from './model/updateEntity'
import { OperationError, OperationErrorType } from './errors/OperationError'
import { Database } from './db/Database'
import { findPrimaryKey } from './utils/findPrimaryKey'
import { generateRestHandlers } from './model/generateRestHandlers'
import { generateGraphQLHandlers } from './model/generateGraphQLHandlers'
import { sync } from './extensions/sync'

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
>(modelName: ModelName, definition: ModelDefinition, db: Database<Dictionary>) {
  const parsedModel = parseModelDefinition(modelName, definition)
  const { primaryKey } = parsedModel

  sync(db)

  if (typeof primaryKey === 'undefined') {
    throw new OperationError(
      OperationErrorType.MissingPrimaryKey,
      `Failed to create a "${modelName}" model: none of the listed properties is marked as a primary key (${Object.keys(
        definition,
      ).join()}).`,
    )
  }

  const api: ModelAPI<Dictionary, ModelName> = {
    create(initialValues = {}) {
      const entity = createModel<Dictionary, ModelName>(
        modelName,
        definition,
        parsedModel,
        initialValues,
        db,
      )

      const entityId = entity[entity.__primaryKey] as string

      invariant(
        !entityId,
        `Failed to create a "${modelName}" entity: expected the primary key "${primaryKey}" to have a value, but got: ${entityId}`,
        new OperationError(OperationErrorType.MissingPrimaryKey),
      )

      // Prevent creation of multiple entities with the same primary key value.
      invariant(
        db.has(modelName, entityId),
        `Failed to create a "${modelName}" entity: an entity with the same primary key "${entityId}" ("${entity.__primaryKey}") already exists.`,
        new OperationError(OperationErrorType.DuplicatePrimaryKey),
      )

      db.create(modelName, entity)

      return entity
    },
    count(query) {
      if (!query) {
        return db.count(modelName)
      }

      const results = executeQuery(modelName, primaryKey, query, db)
      return results.length
    },
    findFirst(query) {
      const results = executeQuery(modelName, primaryKey, query, db)
      const firstResult = first(results)

      invariant(
        query.strict && !firstResult,
        `Failed to execute "findFirst" on the "${modelName}" model: no entity found matching the query "${JSON.stringify(
          query.where,
        )}".`,
        new OperationError(OperationErrorType.EntityNotFound),
      )

      return firstResult
    },
    findMany(query) {
      const results = executeQuery(modelName, primaryKey, query, db)

      invariant(
        query.strict && results.length === 0,
        `Failed to execute "findMany" on the "${modelName}" model: no entities found matching the query "${JSON.stringify(
          query.where,
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
            query.where,
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
          }" ("${primaryKey}") already exists.`,
          new OperationError(OperationErrorType.DuplicatePrimaryKey),
        )
      }

      db.update(modelName, prevRecord, nextRecord)

      return nextRecord
    },
    updateMany({ strict, ...query }) {
      const records = api.findMany(query)
      const updatedRecords: EntityInstance<any, any>[] = []

      if (records.length === 0) {
        invariant(
          strict,
          `Failed to execute "updateMany" on the "${modelName}" model: no entities found matching the query "${JSON.stringify(
            query.where,
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
              query.where,
            )}".`,
            new OperationError(OperationErrorType.EntityNotFound),
          )
        }

        db.update(modelName, prevRecord, nextRecord)
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
            query.where,
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
            query.where,
          )}".`,
          new OperationError(OperationErrorType.EntityNotFound),
        )

        return null
      }

      records.forEach((record) => {
        db.delete(modelName, record[record.__primaryKey] as string)
      })

      return records
    },
    toHandlers(type, baseUrl): any {
      if (type === 'graphql') {
        return generateGraphQLHandlers(modelName, definition, api, baseUrl)
      }

      return generateRestHandlers(modelName, primaryKey, api, baseUrl)
    },
  }

  return api
}
