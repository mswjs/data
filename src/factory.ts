import { format } from 'outvariant'
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
import { updateEntity } from './model/updateEntity'
import { OperationError, OperationErrorType } from './errors/OperationError'
import { Database } from './db/Database'
import { generateRestHandlers } from './model/generateRestHandlers'
import {
  generateGraphQLHandlers,
  generateGraphQLSchema,
} from './model/generateGraphQLHandlers'
import { sync } from './extensions/sync'
import { removeInternalProperties } from './utils/removeInternalProperties'

/**
 * Create a database with the given models.
 */
export function factory<Dictionary extends ModelDictionary>(
  dictionary: Dictionary,
): FactoryAPI<Dictionary> {
  const db = new Database<Dictionary>(dictionary)

  // Initialize database extensions.
  sync(db)

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
  ModelName extends string,
>(
  dictionary: Dictionary,
  modelName: ModelName,
  definition: ModelDefinition,
  db: Database<Dictionary>,
) {
  const parsedModel = parseModelDefinition(dictionary, modelName, definition)
  const { primaryKey } = parsedModel

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

      if (!entityId) {
        throw new OperationError(
          OperationErrorType.MissingPrimaryKey,
          format(
            'Failed to create a "%s" entity: expected the primary key "%s" to have a value, but got: %s',
            modelName,
            primaryKey,
            entityId,
          ),
        )
      }

      // Prevent creation of multiple entities with the same primary key value.
      if (db.has(modelName, entityId)) {
        throw new OperationError(
          OperationErrorType.DuplicatePrimaryKey,
          format(
            'Failed to create a "%s" entity: an entity with the same primary key "%s" ("%s") already exists.',
            modelName,
            entityId,
            entity[InternalEntityProperty.primaryKey],
          ),
        )
      }

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

      if (query.strict && firstResult == null) {
        throw new OperationError(
          OperationErrorType.EntityNotFound,
          format(
            'Failed to execute "findFirst" on the "%s" model: no entity found matching the query "%j".',
            modelName,
            query.where,
          ),
        )
      }

      return firstResult ? removeInternalProperties(firstResult) : null
    },
    findMany(query) {
      const results = executeQuery(modelName, primaryKey, query, db)

      if (results.length === 0 && query.strict) {
        throw new OperationError(
          OperationErrorType.EntityNotFound,
          format(
            'Failed to execute "findMany" on the "%s" model: no entities found matching the query "%j".',
            modelName,
            query.where,
          ),
        )
      }

      return results.map((record) => removeInternalProperties(record))
    },
    getAll() {
      return db
        .listEntities(modelName)
        .map((entity) => removeInternalProperties(entity))
    },
    update({ strict, ...query }) {
      const results = executeQuery(modelName, primaryKey, query, db)
      const prevRecord = first(results)

      if (!prevRecord) {
        if (strict) {
          throw new OperationError(
            OperationErrorType.EntityNotFound,
            format(
              'Failed to execute "update" on the "%s" model: no entity found matching the query "%j".',
              modelName,
              query.where,
            ),
          )
        }

        return null
      }

      const nextRecord = updateEntity(prevRecord, query.data, definition, db)

      if (
        nextRecord[prevRecord[InternalEntityProperty.primaryKey]] !==
        prevRecord[prevRecord[InternalEntityProperty.primaryKey]]
      ) {
        if (
          db.has(
            modelName,
            nextRecord[prevRecord[InternalEntityProperty.primaryKey]],
          )
        ) {
          throw new OperationError(
            OperationErrorType.DuplicatePrimaryKey,
            format(
              'Failed to execute "update" on the "%s" model: the entity with a primary key "%s" ("%s") already exists.',
              modelName,
              nextRecord[prevRecord[InternalEntityProperty.primaryKey]],
              primaryKey,
            ),
          )
        }
      }

      db.update(modelName, prevRecord, nextRecord)

      return removeInternalProperties(nextRecord)
    },
    updateMany({ strict, ...query }) {
      const records = executeQuery(modelName, primaryKey, query, db)
      const updatedRecords: InternalEntity<any, any>[] = []

      if (records.length === 0) {
        if (strict) {
          throw new OperationError(
            OperationErrorType.EntityNotFound,
            format(
              'Failed to execute "updateMany" on the "%s" model: no entities found matching the query "%j".',
              modelName,
              query.where,
            ),
          )
        }

        return null
      }

      records.forEach((prevRecord) => {
        const nextRecord = updateEntity(prevRecord, query.data, definition, db)

        if (
          nextRecord[prevRecord[InternalEntityProperty.primaryKey]] !==
          prevRecord[prevRecord[InternalEntityProperty.primaryKey]]
        ) {
          if (
            db.has(
              modelName,
              nextRecord[prevRecord[InternalEntityProperty.primaryKey]],
            )
          ) {
            throw new OperationError(
              OperationErrorType.DuplicatePrimaryKey,
              format(
                'Failed to execute "updateMany" on the "%s" model: the entity with a primary key "%s" ("%s") already exists.',
                modelName,
                nextRecord[prevRecord[InternalEntityProperty.primaryKey]],
                primaryKey,
              ),
            )
          }
        }

        db.update(modelName, prevRecord, nextRecord)
        updatedRecords.push(nextRecord)
      })

      return updatedRecords.map((record) => removeInternalProperties(record))
    },
    delete({ strict, ...query }) {
      const results = executeQuery(modelName, primaryKey, query, db)
      const record = first(results)

      if (!record) {
        if (strict) {
          throw new OperationError(
            OperationErrorType.EntityNotFound,
            format(
              'Failed to execute "delete" on the "%s" model: no entity found matching the query "%o".',
              modelName,
              query.where,
            ),
          )
        }

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
        if (strict) {
          throw new OperationError(
            OperationErrorType.EntityNotFound,
            format(
              'Failed to execute "deleteMany" on the "%s" model: no entities found matching the query "%o".',
              modelName,
              query.where,
            ),
          )
        }

        return null
      }

      records.forEach((record) => {
        db.delete(
          modelName,
          record[record[InternalEntityProperty.primaryKey]] as string,
        )
      })

      return records.map((record) => removeInternalProperties(record))
    },
    toHandlers(type: 'rest' | 'graphql', baseUrl: string): any {
      if (type === 'graphql') {
        return generateGraphQLHandlers(modelName, definition, api, baseUrl)
      }

      return generateRestHandlers(modelName, definition, api, baseUrl)
    },
    toGraphQLSchema() {
      return generateGraphQLSchema(modelName, definition, api)
    },
  }

  return api
}
