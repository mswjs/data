import { format } from 'outvariant'
import {
  DATABASE_INSTANCE,
  Entity,
  FactoryAPI,
  ModelAPI,
  ModelDefinition,
  ModelDictionary,
  PRIMARY_KEY,
} from './glossary'
import { first } from './utils/first'
import { executeQuery } from './query/executeQuery'
import { parseModelDefinition } from './model/parseModelDefinition'
import { createModel } from './model/createModel'
import { updateEntity } from './model/updateEntity'
import {
  OperationError,
  OperationErrorType,
} from './utils/errors/OperationError'
import { Database } from './db/Database'
import { generateRestHandlers } from './model/generateRestHandlers'
import {
  generateGraphQLHandlers,
  generateGraphQLSchema,
} from './model/generateGraphQLHandlers'
import { sync } from './extensions/sync'

/**
 * Create a database with the given models.
 */
export function factory<Dictionary extends ModelDictionary>(
  dictionary: Dictionary,
): FactoryAPI<Dictionary> {
  const db = new Database<Dictionary>(dictionary)

  // Initialize database extensions.
  sync(db)

  return Object.entries(dictionary).reduce<any>(
    (acc, [modelName, props]) => {
      acc[modelName] = createModelApi<Dictionary, typeof modelName>(
        dictionary,
        modelName,
        props,
        db,
      )
      return acc
    },
    {
      [DATABASE_INSTANCE]: db,
    },
  )
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
        dictionary,
        parsedModel,
        initialValues,
        db,
      )

      const entityId = entity[entity[PRIMARY_KEY]] as string

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
            entity[PRIMARY_KEY],
          ),
        )
      }

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

      return firstResult as Entity<any, any>
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

      return results
    },
    getAll() {
      return db.listEntities(modelName)
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

        return null as any
      }

      const nextRecord = updateEntity(prevRecord, query.data, definition)

      if (
        nextRecord[prevRecord[PRIMARY_KEY]] !==
        prevRecord[prevRecord[PRIMARY_KEY]]
      ) {
        if (db.has(modelName, nextRecord[prevRecord[PRIMARY_KEY]])) {
          throw new OperationError(
            OperationErrorType.DuplicatePrimaryKey,
            format(
              'Failed to execute "update" on the "%s" model: the entity with a primary key "%s" ("%s") already exists.',
              modelName,
              nextRecord[prevRecord[PRIMARY_KEY]],
              primaryKey,
            ),
          )
        }
      }

      db.update(modelName, prevRecord, nextRecord)

      return nextRecord
    },
    updateMany({ strict, ...query }) {
      const records = executeQuery(modelName, primaryKey, query, db)
      const updatedRecords: Entity<any, any>[] = []

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

        return null as any
      }

      records.forEach((prevRecord) => {
        const nextRecord = updateEntity(prevRecord, query.data, definition)

        if (
          nextRecord[prevRecord[PRIMARY_KEY]] !==
          prevRecord[prevRecord[PRIMARY_KEY]]
        ) {
          if (db.has(modelName, nextRecord[prevRecord[PRIMARY_KEY]])) {
            throw new OperationError(
              OperationErrorType.DuplicatePrimaryKey,
              format(
                'Failed to execute "updateMany" on the "%s" model: the entity with a primary key "%s" ("%s") already exists.',
                modelName,
                nextRecord[prevRecord[PRIMARY_KEY]],
                primaryKey,
              ),
            )
          }
        }

        db.update(modelName, prevRecord, nextRecord)
        updatedRecords.push(nextRecord)
      })

      return updatedRecords
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

        return null as any
      }

      db.delete(modelName, record[record[PRIMARY_KEY]] as string)
      return record
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

        return null as any
      }

      records.forEach((record) => {
        db.delete(modelName, record[record[PRIMARY_KEY]] as string)
      })

      return records
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
