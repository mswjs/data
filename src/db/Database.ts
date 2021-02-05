import { EntityInstance, ModelDictionary, PrimaryKeyType } from '../glossary'

export class Database<Dictionary extends ModelDictionary> {
  private models: Record<string, Map<string, EntityInstance<Dictionary, any>>>

  constructor(dictionary: Dictionary) {
    this.models = Object.keys(dictionary).reduce((acc, modelName) => {
      acc[modelName] = new Map<string, EntityInstance<Dictionary, string>>()

      return acc
    }, {})
  }

  getModel(name: string) {
    return this.models[name]
  }

  create(
    modelName: string,
    entity: EntityInstance<Dictionary, any>,
    customPrimaryKey?: PrimaryKeyType,
  ) {
    const primaryKey =
      customPrimaryKey || (entity[entity.__primaryKey] as string)
    return this.getModel(modelName).set(primaryKey, entity)
  }

  has(modelName: string, primaryKey: PrimaryKeyType) {
    return this.getModel(modelName).has(primaryKey)
  }

  count(modelName: string) {
    return this.getModel(modelName).size
  }

  delete(modelName: string, primaryKey: PrimaryKeyType) {
    this.getModel(modelName).delete(primaryKey)
  }

  listEntities(modelName: string) {
    return Array.from(this.getModel(modelName).values())
  }
}
