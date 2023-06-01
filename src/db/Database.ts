import md5 from 'md5'
import { invariant } from 'outvariant'
import { Emitter } from 'strict-event-emitter'
import {
  Entity,
  ENTITY_TYPE,
  KeyType,
  ModelDictionary,
  PrimaryKeyType,
  PRIMARY_KEY,
} from '../glossary'

export const SERIALIZED_INTERNAL_PROPERTIES_KEY =
  'SERIALIZED_INTERNAL_PROPERTIES'

type Models<Dictionary extends ModelDictionary> = Record<
  keyof Dictionary,
  Map<PrimaryKeyType, Entity<Dictionary, any>>
>

export interface SerializedInternalEntityProperties {
  entityType: string
  primaryKey: PrimaryKeyType
}

export interface SerializedEntity extends Entity<any, any> {
  [SERIALIZED_INTERNAL_PROPERTIES_KEY]: SerializedInternalEntityProperties
}

export type DatabaseEventsMap = {
  create: [
    sourceId: string,
    modelName: KeyType,
    entity: SerializedEntity,
    customPrimaryKey?: PrimaryKeyType,
  ]
  update: [
    sourceId: string,
    modelName: KeyType,
    prevEntity: SerializedEntity,
    nextEntity: SerializedEntity,
  ]
  delete: [sourceId: string, modelName: KeyType, primaryKey: PrimaryKeyType]
}

let callOrder = 0

export class Database<Dictionary extends ModelDictionary> {
  public id: string
  public events: Emitter<DatabaseEventsMap>
  private models: Models<Dictionary>

  constructor(dictionary: Dictionary) {
    this.events = new Emitter()
    this.models = Object.keys(dictionary).reduce<Models<Dictionary>>(
      (acc, modelName: keyof Dictionary) => {
        acc[modelName] = new Map<string, Entity<Dictionary, string>>()
        return acc
      },
      {} as Models<Dictionary>,
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

  private serializeEntity(entity: Entity<Dictionary, any>): SerializedEntity {
    return {
      ...entity,
      [SERIALIZED_INTERNAL_PROPERTIES_KEY]: {
        entityType: entity[ENTITY_TYPE],
        primaryKey: entity[PRIMARY_KEY],
      },
    }
  }

  getModel<ModelName extends keyof Dictionary>(name: ModelName) {
    return this.models[name]
  }

  create<ModelName extends keyof Dictionary>(
    modelName: ModelName,
    entity: Entity<Dictionary, ModelName>,
    customPrimaryKey?: PrimaryKeyType,
  ): Map<PrimaryKeyType, Entity<Dictionary, ModelName>> {
    invariant(
      entity[ENTITY_TYPE],
      'Failed to create a new "%s" record: provided entity has no type. %j',
      modelName,
      entity,
    )
    invariant(
      entity[PRIMARY_KEY],
      'Failed to create a new "%s" record: provided entity has no primary key. %j',
      modelName,
      entity,
    )

    const primaryKey =
      customPrimaryKey || (entity[entity[PRIMARY_KEY]] as string)

    this.events.emit(
      'create',
      this.id,
      modelName,
      this.serializeEntity(entity),
      customPrimaryKey,
    )
    return this.getModel(modelName).set(primaryKey, entity)
  }

  update<ModelName extends keyof Dictionary>(
    modelName: ModelName,
    prevEntity: Entity<Dictionary, ModelName>,
    nextEntity: Entity<Dictionary, ModelName>,
  ): void {
    const prevPrimaryKey = prevEntity[prevEntity[PRIMARY_KEY]] as PrimaryKeyType
    const nextPrimaryKey = nextEntity[prevEntity[PRIMARY_KEY]] as PrimaryKeyType

    if (nextPrimaryKey !== prevPrimaryKey) {
      this.delete(modelName, prevPrimaryKey)
    }

    this.getModel(modelName).set(nextPrimaryKey, nextEntity)

    // this.create(modelName, nextEntity, nextPrimaryKey)
    this.events.emit(
      'update',
      this.id,
      modelName,
      this.serializeEntity(prevEntity),
      this.serializeEntity(nextEntity),
    )
  }

  delete<ModelName extends keyof Dictionary>(
    modelName: ModelName,
    primaryKey: PrimaryKeyType,
  ): void {
    this.getModel(modelName).delete(primaryKey)
    this.events.emit('delete', this.id, modelName, primaryKey)
  }

  has<ModelName extends keyof Dictionary>(
    modelName: ModelName,
    primaryKey: PrimaryKeyType,
  ): boolean {
    return this.getModel(modelName).has(primaryKey)
  }

  count<ModelName extends string>(modelName: ModelName) {
    return this.getModel(modelName).size
  }

  listEntities<ModelName extends keyof Dictionary>(
    modelName: ModelName,
  ): Entity<Dictionary, ModelName>[] {
    return Array.from(this.getModel(modelName).values())
  }
}
