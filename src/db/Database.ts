import { StrictEventEmitter } from 'strict-event-emitter'
import { EntityInstance, ModelDictionary, PrimaryKeyType } from '../glossary'

type Models<Dictionary extends ModelDictionary> = Record<
  string,
  Map<string, EntityInstance<Dictionary, any>>
>

export type DatabaseMethodToEventFn<Method extends (...args: any[]) => any> = (
  ...args: Parameters<Method>
) => void

export interface DatabaseEventsMap {
  create: DatabaseMethodToEventFn<Database<any>['create']>
  update: DatabaseMethodToEventFn<Database<any>['update']>
  delete: DatabaseMethodToEventFn<Database<any>['delete']>
}

export class Database<Dictionary extends ModelDictionary> {
  public events: StrictEventEmitter<DatabaseEventsMap>
  private models: Models<ModelDictionary>

  constructor(dictionary: Dictionary) {
    this.events = new StrictEventEmitter()
    this.models = Object.keys(dictionary).reduce<Models<ModelDictionary>>(
      (acc, modelName) => {
        acc[modelName] = new Map<string, EntityInstance<Dictionary, string>>()
        return acc
      },
      {},
    )
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

    this.events.emit('create', modelName, entity, customPrimaryKey)

    return this.getModel(modelName).set(primaryKey, entity)
  }

  update(
    modelName: string,
    prevEntity: EntityInstance<Dictionary, any>,
    nextEntity: EntityInstance<Dictionary, any>,
  ) {
    const prevPrimaryKey = prevEntity[prevEntity.__primaryKey]
    const nextPrimaryKey = nextEntity[prevEntity.__primaryKey]

    if (nextPrimaryKey !== prevPrimaryKey) {
      this.delete(modelName, prevPrimaryKey as string)
    }

    this.create(modelName, nextEntity, nextPrimaryKey as string)
    this.events.emit('update', modelName, prevEntity, nextEntity)
  }

  has(modelName: string, primaryKey: PrimaryKeyType) {
    return this.getModel(modelName).has(primaryKey)
  }

  count(modelName: string) {
    return this.getModel(modelName).size
  }

  delete(modelName: string, primaryKey: PrimaryKeyType) {
    this.getModel(modelName).delete(primaryKey)
    this.events.emit('delete', modelName, primaryKey)
  }

  listEntities(modelName: string) {
    return Array.from(this.getModel(modelName).values())
  }
}
