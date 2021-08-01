import { debug } from 'debug'
import get from 'lodash/get'
import set from 'lodash/set'
import { isObject } from '../utils/isObject'
import { Database } from '../db/Database'
import {
  Entity,
  InternalEntity,
  InternalEntityProperty,
  ModelDictionary,
  Relation,
  RelationKind,
  Value,
} from '../glossary'
import { executeQuery } from '../query/executeQuery'
import { first } from '../utils/first'

const log = debug('defineRelationalProperties')

type RelationalPropertyDescriptorMap = {
  [property: string]: Omit<PropertyDescriptor, 'get'> & {
    get(): InternalEntity<any, any> | InternalEntity<any, any>[]
  }
}

export function defineRelationalProperties(
  entity: InternalEntity<any, any>,
  initialValues: Partial<Value<any, ModelDictionary>>,
  relations: Record<string, Relation>,
  db: Database<any>,
): void {
  log('setting relations', relations, entity)

  const properties = Object.entries(
    relations,
  ).reduce<RelationalPropertyDescriptorMap>(
    (properties, [property, relation]) => {
      log(
        `defining relational property "${entity.__type}.${property}"`,
        relation,
      )

      if (!get(initialValues, property)) return properties

      // Take the relational entity reference from the initial values.
      const entityRefs: Entity<any, any>[] = [].concat(
        get(initialValues, property),
      )

      if (relation.unique) {
        log(`verifying that the "${property}" relation is unique...`)

        // Trying to look up an entity of the same type
        // that references the same relational entity.
        const existingEntities = executeQuery(
          entity[InternalEntityProperty.type],
          entity[InternalEntityProperty.primaryKey],
          {
            where: {
              [property]: {
                [relation.primaryKey]: {
                  in: entityRefs.map(
                    (entityRef) =>
                      entityRef[entity[InternalEntityProperty.primaryKey]],
                  ),
                },
              },
            },
          },
          db,
        )

        log(
          `existing entities that reference the same "${property}"`,
          existingEntities,
        )

        if (existingEntities.length > 0) {
          log(`found a non-unique relational entity!`)

          throw new Error(
            `Failed to create a unique "${relation.modelName}" relation for "${
              entity.__type
            }.${property}" (${
              entity[entity[InternalEntityProperty.primaryKey]]
            }): the provided entity is already used.`,
          )
        }
      }

      set(properties, property, {
        enumerable: true,
        get() {
          log(`get "${property}"`, relation)

          const refValue = entityRefs.reduce<InternalEntity<any, any>[]>(
            (list, entityRef) => {
              return list.concat(
                executeQuery(
                  relation.modelName,
                  relation.primaryKey,
                  {
                    where: {
                      [relation.primaryKey]: {
                        equals: entityRef[relation.primaryKey],
                      },
                    },
                  },
                  db,
                ),
              )
            },
            [],
          )

          log(`resolved "${relation.kind}" "${property}" to`, refValue)

          return relation.kind === RelationKind.OneOf
            ? first(refValue)!
            : refValue
        },
      })
      return properties
    },
    {},
  )
  defineNestedProperties(entity, properties, '')
}

function defineNestedProperties(
  entity: InternalEntity<any, any>,
  properties: any,
  path: string,
) {
  for (let key in properties) {
    const value = properties[key]
    const nestedPath = path ? `${path}.${key}` : key

    if (isRelationalProperty(value)) {
      const nestedPathArray = nestedPath.split('.')
      nestedPathArray.reduce((acc, curr, i) => {
        if (i === nestedPathArray.length - 1) {
          Object.defineProperty(acc, curr, value)
        }
        return acc[curr]
      }, entity)
    } else if (isObject(value)) {
      defineNestedProperties(entity, value, nestedPath)
    }
  }
}

function isRelationalProperty(val: any) {
  return val?.enumerable && typeof val?.get === 'function'
}
