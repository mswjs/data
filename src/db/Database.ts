import md5 from 'md5'
import { StrictEventEmitter } from 'strict-event-emitter'
import {
  Entity,
  InternalEntity,
  InternalEntityProperty,
  ModelDictionary,
  PrimaryKeyType,
  RelationKind,
} from '../glossary'

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
   * Returns a JSON representation of the current database entities.
   */
  toJson(): Record<string, any> {
    console.log('input:', this.models)

    return Object.entries(this.models).reduce<Record<string, any>>(
      (json, [modelName, entities]) => {
        const modelJson: [PrimaryKeyType, Entity<any, any>][] = []

        for (const [primaryKey, entity] of entities.entries()) {
          const descriptors = Object.getOwnPropertyDescriptors(entity)
          const jsonEntity: Entity<any, any> = {} as any

          for (const propertyName in descriptors) {
            const node = descriptors[propertyName]
            const isRelationalProperty =
              !node.hasOwnProperty('value') && node.hasOwnProperty('get')

            console.log('analyzing "%s.%s"', modelName, propertyName)

            if (isRelationalProperty) {
              console.log(
                'found a relational property "%s" on "%s"',
                propertyName,
                modelName,
              )

              /**
               * @todo Handle `manyOf` relation: this variable will be a list
               * of relations in that case.
               */
              const resolvedRelationNode = node.get?.()

              console.log('value', node)
              console.log('resolved relation:', node.get?.())

              jsonEntity[propertyName] = {
                kind: RelationKind.OneOf,
                modelName: resolvedRelationNode.__type,
                unique: false,
                refs: [
                  {
                    __type: resolvedRelationNode.__type,
                    __primaryKey: resolvedRelationNode.__primaryKey,
                    __nodeId:
                      resolvedRelationNode[resolvedRelationNode.__primaryKey],
                  },
                ],
              }
            } else {
              console.log('property "%s" is not relational', propertyName)
              jsonEntity[propertyName] = node.value
            }
          }

          console.log({ jsonEntity })

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

  hydrate(state: Dictionary) {
    // this.models = {}
  }
}
