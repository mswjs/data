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
  EntityInstance,
  ModelDictionary,
} from './glossary'
import { first } from './utils/first'
import { executeQuery } from './query/executeQuery'
import { compileQuery } from './query/compileQuery'
import { parseModelDeclaration } from './model/parseModelDeclaration'
import { createModel } from './model/createModel'

/**
 * Create a database models factory.
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
      let nextEntity: EntityInstance<Dictionary, ModelName>

      for (let index = 0; index < prevRecords.length; index++) {
        const entity = prevRecords[index]

        if (executeQuery(entity)) {
          nextEntity = mergeDeepRight(entity, query.data) as any
          db[modelName].splice(index, -1, nextEntity)
          break
        }
      }

      return nextEntity
    },
    updateMany(query) {
      const executeQuery = compileQuery(query)
      const prevRecords = db[modelName]
      let nextEntity: EntityInstance<Dictionary, ModelName>

      const { updatedEntities, entities } = prevRecords.reduce(
        (acc, entity) => {
          if (executeQuery(entity)) {
            const evaluatedData = Object.entries(query.data).reduce(
              (acc, [property, propertyValue]) => {
                const nextValue =
                  typeof propertyValue === 'function'
                    ? propertyValue(entity[property])
                    : propertyValue
                acc[property] = nextValue
                return acc
              },
              {},
            )
            nextEntity = mergeDeepRight(entity, evaluatedData) as any
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
      let deletedEntity: EntityInstance<Dictionary, ModelName>
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
      const { deletedRecords, newRecords } = prevRecords.reduce<{
        deletedRecords: EntityInstance<Dictionary, ModelName>[]
        newRecords: EntityInstance<Dictionary, ModelName>[]
      }>(
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
