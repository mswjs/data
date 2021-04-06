import { StrictEventEmitter } from 'strict-event-emitter'
import { EntityInstance, ModelDictionary, PrimaryKeyType } from '../glossary'

export interface DatabaseEventsMap {
  create: Database<any>['create']
  update: Database<any>['update']
  delete: Database<any>['delete']
}

export class Database<Dictionary extends ModelDictionary> {
  public events: StrictEventEmitter<DatabaseEventsMap>

  private shouldBroadcast: boolean
  private models: Record<string, Map<string, EntityInstance<Dictionary, any>>>

  constructor(dictionary: Dictionary) {
    this.shouldBroadcast = true
    this.events = new StrictEventEmitter()
    this.models = Object.keys(dictionary).reduce((models, modelName) => {
      models[modelName] = new Map<string, EntityInstance<Dictionary, string>>()
      return models
    }, {})
  }

  /**
   * Stop the changes broadcasting
   */
  stopBroadcasting() {
    this.shouldBroadcast = false
  }

  resumeBroadcasting() {
    this.shouldBroadcast = true
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
    this.getModel(modelName).set(primaryKey, entity)

    if (this.shouldBroadcast) {
      this.events.emit('create', modelName, entity, customPrimaryKey)
    }
  }

  update(
    modelName: string,
    nextEntity: EntityInstance<Dictionary, any>,
    prevEntity: EntityInstance<Dictionary, any>,
  ) {
    const nextPrimaryKey = nextEntity[prevEntity.__primaryKey]
    const prevPrimaryKey = prevEntity[prevEntity.__primaryKey]

    if (nextPrimaryKey !== prevPrimaryKey) {
      this.delete(modelName, prevPrimaryKey as string)
    }

    this.create(modelName, nextEntity, nextPrimaryKey as string)

    if (this.shouldBroadcast) {
      this.events.emit('update', modelName, nextEntity, prevEntity)
    }
  }

  has(modelName: string, primaryKey: PrimaryKeyType) {
    return this.getModel(modelName).has(primaryKey)
  }

  /**
   * Return the amount of existing entities for the given model.
   */
  count(modelName: string) {
    return this.getModel(modelName).size
  }

  /**
   * Delete the entity of the model by the given
   */
  delete(modelName: string, primaryKey: PrimaryKeyType) {
    const models = this.getModel(modelName)
    models.delete(primaryKey)

    if (this.shouldBroadcast) {
      this.events.emit('delete', modelName, primaryKey)
    }
  }

  listEntities(modelName: string) {
    return Array.from(this.getModel(modelName).values())
  }
}
