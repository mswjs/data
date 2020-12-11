import { mergeDeepRight } from 'ramda'
import {
  FactoryAPI,
  Value,
  Limit,
  Database,
  RelationKind,
  OneOf,
  ManyOf,
  ModelAPI,
} from './glossary'
import { first } from './utils/first'
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
  const db: Database<Value<T, T>> = Object.keys(dict).reduce(
    (acc, modelName) => {
      acc[modelName] = []
      return acc
    },
    {}
  )

  return Object.entries(dict).reduce<any>((acc, [modelName, props]) => {
    acc[modelName] = createModelApi(modelName, props, db)
    return acc
  }, {})
}

function createModelApi<ModelName extends string>(
  modelName: ModelName,
  declaration: Record<string, any> /** @todo */,
  db: Database<any>
): ModelAPI<any, any> {
  return {
    create(initialValues = {}) {
      const { properties, relations } = parseModelDeclaration(
        modelName,
        declaration,
        initialValues
      )
      const model = createModel(modelName, properties, relations, db)

      db[modelName].push(model)
      return model
    },
    many: () => null,
    count() {
      return db[modelName].length
    },
    findOne(query) {
      const results = executeQuery(modelName, query, db)
      return first(results)
    },
    findMany(query) {
      return executeQuery(modelName, query, db)
    },
    update(query) {
      let nextEntity: any
      const executeQuery = compileQuery(query)
      const prevRecords = db[modelName]

      for (let i = 0; i < prevRecords.length; i++) {
        const entity = prevRecords[i]

        if (executeQuery(entity)) {
          nextEntity = mergeDeepRight(entity, query.data)
          db[modelName].splice(i, -1, nextEntity)
          break
        }
      }

      return nextEntity
    },
    delete(query) {
      let deletedEntity: any
      const executeQuery = compileQuery(query)
      const prevRecords = db[modelName]

      for (let i = 0; i < prevRecords.length; i++) {
        const entity = prevRecords[i]

        if (!executeQuery(entity)) {
          deletedEntity = entity
          db[modelName].splice(i, 1)
          break
        }
      }

      return deletedEntity
    },
  }
}

export function oneOf<T extends string>(modelName: T): OneOf<T> {
  return {
    __type: RelationKind.OneOf,
    modelName,
  }
}

export function manyOf<T extends string>(modelName: T): ManyOf<T> {
  return {
    __type: RelationKind.ManyOf,
    modelName,
  }
}
