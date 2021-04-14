import md5 from 'md5'
import { StrictEventEmitter } from 'strict-event-emitter'
import {
  InternalEntityInstance,
  ModelDictionary,
  PrimaryKeyType,
} from '../glossary'

type Models<Dictionary extends ModelDictionary> = Record<
  string,
  Map<string, InternalEntityInstance<Dictionary, any>>
>

export type DatabaseMethodToEventFn<Method extends (...args: any[]) => any> = (
  id: string,
  ...args: Parameters<Method>
) => void

export interface DatabaseEventsMap {
  create: DatabaseMethodToEventFn<Database<any>['create']>
  update: DatabaseMethodToEventFn<Database<any>['update']>
  delete: DatabaseMethodToEventFn<Database<any>['delete']>
}

let callOrder = 0

export class Database<Dictionary extends ModelDictionary> {
  public id: string
  public events: StrictEventEmitter<DatabaseEventsMap>
  private models: Models<Dictionary>

  constructor(dictionary: Dictionary) {
    this.events = new StrictEventEmitter()
    this.models = Object.keys(dictionary).reduce<Models<Dictionary>>(
      (acc, modelName) => {
        acc[modelName] = new Map<
          string,
          InternalEntityInstance<Dictionary, string>
        >()
        return acc
      },
      {},
    )

    callOrder++
    this.id = this.generateId()
  }

  /**
   * Generates a unique MD5 hash based on the database
   * module location and invocation order. Used to reproducibly
   * identify a database instance among sibling instances.
   */
  private generateId() {
    const { stack } = new Error()
    const callFrame = stack?.split('\n')[4]
    const salt = `${callOrder}-${callFrame?.trim()}`
    return md5(salt)
  }

  getModel<ModelName extends string>(name: ModelName) {
    return this.models[name]
  }

  create<ModelName extends string>(
    modelName: ModelName,
    entity: InternalEntityInstance<Dictionary, any>,
    customPrimaryKey?: PrimaryKeyType,
  ) {
    const primaryKey =
      customPrimaryKey || (entity[entity.__primaryKey] as string)

    this.events.emit('create', this.id, modelName, entity, customPrimaryKey)

    return this.getModel(modelName).set(primaryKey, entity)
  }

  update<ModelName extends string>(
    modelName: ModelName,
    prevEntity: InternalEntityInstance<Dictionary, any>,
    nextEntity: InternalEntityInstance<Dictionary, any>,
  ) {
    const prevPrimaryKey = prevEntity[prevEntity.__primaryKey]
    const nextPrimaryKey = nextEntity[prevEntity.__primaryKey]

    if (nextPrimaryKey !== prevPrimaryKey) {
      this.delete(modelName, prevPrimaryKey as string)
    }

    this.create(modelName, nextEntity, nextPrimaryKey as string)
    this.events.emit('update', this.id, modelName, prevEntity, nextEntity)
  }

  has<ModelName extends string>(
    modelName: ModelName,
    primaryKey: PrimaryKeyType,
  ) {
    return this.getModel(modelName).has(primaryKey)
  }

  count<ModelName extends string>(modelName: ModelName) {
    return this.getModel(modelName).size
  }

  delete<ModelName extends string>(
    modelName: ModelName,
    primaryKey: PrimaryKeyType,
  ) {
    this.getModel(modelName).delete(primaryKey)
    this.events.emit('delete', this.id, modelName, primaryKey)
  }

  listEntities<ModelName extends string>(
    modelName: ModelName,
  ): InternalEntityInstance<Dictionary, ModelName>[] {
    return Array.from(this.getModel(modelName).values())
  }
}
