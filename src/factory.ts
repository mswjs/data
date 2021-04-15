import {
  InternalEntity,
  FactoryAPI,
  ModelAPI,
  ModelDefinition,
  ModelDictionary,
  InternalEntityProperty,
} from './glossary'
import { first } from './utils/first'
import { executeQuery } from './query/executeQuery'
import { parseModelDefinition } from './model/parseModelDefinition'
import { createModel } from './model/createModel'
import { invariant } from './utils/invariant'
import { updateEntity } from './model/updateEntity'
import { OperationError, OperationErrorType } from './errors/OperationError'
import { Database } from './db/Database'
import { generateRestHandlers } from './model/generateRestHandlers'
import { generateGraphQLHandlers } from './model/generateGraphQLHandlers'
import { sync } from './extensions/sync'
import { removeInternalProperties } from './utils/removeInternalProperties'

/**
 * Create a database with the given models.
 */
export function factory<Dictionary extends ModelDictionary>(
  dictionary: Dictionary,
): FactoryAPI<Dictionary> {
  const db = new Database<Dictionary>(dictionary)

  return Object.entries(dictionary).reduce<any>((acc, [modelName, props]) => {
    acc[modelName] = createModelApi<Dictionary, typeof modelName>(
      dictionary,
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
  dictionary: Dictionary,
  modelName: ModelName,
  definition: ModelDefinition,
  db: Database<Dictionary>,
) {
  const parsedModel = parseModelDefinition(dictionary, modelName, definition)
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

      const entityId = entity[
        entity[InternalEntityProperty.primaryKey]
      ] as string

      invariant(
        !entityId,
        `Failed to create a "${modelName}" entity: expected the primary key "${primaryKey}" to have a value, but got: ${entityId}`,
        new OperationError(OperationErrorType.MissingPrimaryKey),
      )

      // Prevent creation of multiple entities with the same primary key value.
      invariant(
        db.has(modelName, entityId),
        `Failed to create a "${modelName}" entity: an entity with the same primary key "${entityId}" ("${
          entity[InternalEntityProperty.primaryKey]
        }") already exists.`,
        new OperationError(OperationErrorType.DuplicatePrimaryKey),
      )

      db.create(modelName, entity)
      return removeInternalProperties(entity)
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

      return firstResult ? removeInternalProperties(firstResult) : null
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

      return results.map(removeInternalProperties)
    },
    getAll() {
      return db.listEntities(modelName).map(removeInternalProperties)
    },
    update({ strict, ...query }) {
      const results = executeQuery(modelName, primaryKey, query, db)
      const prevRecord = first(results)

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
        nextRecord[prevRecord[InternalEntityProperty.primaryKey]] !==
        prevRecord[prevRecord[InternalEntityProperty.primaryKey]]
      ) {
        invariant(
          db.has(
            modelName,
            nextRecord[prevRecord[InternalEntityProperty.primaryKey]],
          ),
          `Failed to execute "update" on the "${modelName}" model: the entity with a primary key "${
            nextRecord[prevRecord[InternalEntityProperty.primaryKey]]
          }" ("${primaryKey}") already exists.`,
          new OperationError(OperationErrorType.DuplicatePrimaryKey),
        )
      }

      db.update(modelName, prevRecord, nextRecord)

      return removeInternalProperties(nextRecord)
    },
    updateMany({ strict, ...query }) {
      const records = executeQuery(modelName, primaryKey, query, db)
      const updatedRecords: InternalEntity<any, any>[] = []

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
          nextRecord[prevRecord[InternalEntityProperty.primaryKey]] !==
          prevRecord[prevRecord[InternalEntityProperty.primaryKey]]
        ) {
          invariant(
            db.has(
              modelName,
              nextRecord[prevRecord[InternalEntityProperty.primaryKey]],
            ),
            `Failed to execute "updateMany" on the "${modelName}" model: no entities found matching the query "${JSON.stringify(
              query.where,
            )}".`,
            new OperationError(OperationErrorType.EntityNotFound),
          )
        }

        db.update(modelName, prevRecord, nextRecord)
        updatedRecords.push(nextRecord)
      })

      return updatedRecords.map(removeInternalProperties)
    },
    delete({ strict, ...query }) {
      const results = executeQuery(modelName, primaryKey, query, db)
      const record = first(results)

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

      db.delete(
        modelName,
        record[record[InternalEntityProperty.primaryKey]] as string,
      )
      return removeInternalProperties(record)
    },
    deleteMany({ strict, ...query }) {
      const records = executeQuery(modelName, primaryKey, query, db)

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
        db.delete(
          modelName,
          record[record[InternalEntityProperty.primaryKey]] as string,
        )
      })

      return records.map(removeInternalProperties)
    },
    toHandlers(type, baseUrl): any {
      if (type === 'graphql') {
        return generateGraphQLHandlers(modelName, definition, api, baseUrl)
      }

      return generateRestHandlers(modelName, definition, api, baseUrl)
    },
  }

  return api
}
