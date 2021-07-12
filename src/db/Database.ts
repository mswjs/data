import md5 from 'md5'
import { debug } from 'debug'
import { StrictEventEmitter } from 'strict-event-emitter'
import {
  Entity,
  InternalEntity,
  InternalEntityProperty,
  ModelDictionary,
  PrimaryKeyType,
  Relation,
  RelationKind,
} from '../glossary'

const log = debug('Database')

type Models<Dictionary extends ModelDictionary> = Record<
  string,
  Map<PrimaryKeyType, InternalEntity<Dictionary, any>>
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
        acc[modelName] = new Map<string, InternalEntity<Dictionary, string>>()
        return acc
      },
      {},
    )

    callOrder++
    this.id = this.generateId()

    log('constructed a new Database (%s)', this.id, this.models)
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
    entity: InternalEntity<Dictionary, any>,
    customPrimaryKey?: PrimaryKeyType,
  ) {
    const primaryKey =
      customPrimaryKey ||
      (entity[entity[InternalEntityProperty.primaryKey]] as string)

    const createdEntity = this.getModel(modelName).set(primaryKey, entity)
    this.events.emit('create', this.id, modelName, entity, customPrimaryKey)

    return createdEntity
  }

  update<ModelName extends string>(
    modelName: ModelName,
    prevEntity: InternalEntity<Dictionary, any>,
    nextEntity: InternalEntity<Dictionary, any>,
  ) {
    const prevPrimaryKey =
      prevEntity[prevEntity[InternalEntityProperty.primaryKey]]
    const nextPrimaryKey =
      nextEntity[prevEntity[InternalEntityProperty.primaryKey]]

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
  ): InternalEntity<Dictionary, ModelName>[] {
    return Array.from(this.getModel(modelName).values())
  }

  /**
   * Serializes database entities into JSON.
   */
  toJson(): Record<string, any> {
    log('toJson', this.models)

    return Object.entries(this.models).reduce<Record<string, any>>(
      (json, [modelName, entities]) => {
        const modelJson: [PrimaryKeyType, Entity<any, any>][] = []

        for (const [primaryKey, entity] of entities.entries()) {
          const descriptors = Object.getOwnPropertyDescriptors(entity)
          const jsonEntity: Entity<any, any> = {} as any

          log('"%s" entity', modelName, entity)
          log('descriptors for "%s" model:', modelName, descriptors)

          for (const propertyName in descriptors) {
            const node = descriptors[propertyName]
            const isRelationalProperty =
              !node.hasOwnProperty('value') && node.hasOwnProperty('get')

            log('analyzing "%s.%s"', modelName, propertyName)

            if (isRelationalProperty) {
              log(
                'found a relational property "%s.%s"',
                modelName,
                propertyName,
              )

              /**
               * @fixme Handle `manyOf` relation: this variable will be a list
               * of relations in that case.
               * THERE IS ALSO A SIMILAR LOGIC SOMEWHERE. REUSE?
               */
              const resolvedRelationNode = node.get?.()! as any
              log('resolved relational node', resolvedRelationNode)

              const relation: Relation = {
                kind: RelationKind.OneOf,
                modelName: resolvedRelationNode[InternalEntityProperty.type],
                unique: false,
                primaryKey:
                  resolvedRelationNode[InternalEntityProperty.primaryKey],
              }

              jsonEntity[propertyName] = relation
            } else {
              log('property "%s.%s" is not relational', modelName, propertyName)
              jsonEntity[propertyName] = node.value
            }
          }

          log('JSON for "%s":\n', modelName, jsonEntity)

          /**
           * @todo How to persist relational properties?
           * Need to write down pointers, kinda like they work internally.
           */
          modelJson.push([primaryKey, jsonEntity])
        }

        json[modelName] = modelJson
        return json
      },
      {},
    )
  }
}
