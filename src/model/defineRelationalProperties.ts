import { debug } from 'debug'
import get from 'lodash/get'
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
import { invariant } from '../utils/invariant'
import { definePropertyAtPath } from '../utils/definePropertyAtPath'

const log = debug('defineRelationalProperties')

type RelationalPropertyDescriptor = Omit<PropertyDescriptor, 'get'> & {
  get(): InternalEntity<any, any> | InternalEntity<any, any>[]
}

export function defineRelationalProperties(
  entity: InternalEntity<any, any>,
  initialValues: Partial<Value<any, ModelDictionary>>,
  relations: Record<string, Relation>,
  db: Database<any>,
): void {
  log('defining relational properties...', { entity, initialValues, relations })

  for (const [propertyPath, relation] of Object.entries(relations)) {
    log(
      `setting relational property "${entity.__type}.${propertyPath}"`,
      relation,
    )

    if (!get(initialValues, propertyPath)) {
      log('relation has no initial value, skipping...')
      continue
    }

    // Take the relational entity reference from the initial values.
    const entityRefs: Entity<any, any>[] = [].concat(
      get(initialValues, propertyPath),
    )

    log('entity references:', entityRefs)

    if (relation.unique) {
      log('"%s" is a unique relation, verifying..."', propertyPath)

      // Trying to look up an entity of the same type
      // that references the same relational entity.
      const existingEntities = executeQuery(
        entity[InternalEntityProperty.type],
        entity[InternalEntityProperty.primaryKey],
        {
          where: {
            /**
             * @fixme Would "property.path" work when querying?
             */
            [propertyPath]: {
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
        `existing entities that reference the same "${propertyPath}"`,
        existingEntities,
      )

      invariant(
        existingEntities.length !== 0,
        `Failed to create a unique "${relation.modelName}" relation for "${
          entity.__type
        }.${propertyPath}" (${
          entity[entity[InternalEntityProperty.primaryKey]]
        }): the provided entity is already used.`,
      )
    }

    definePropertyAtPath<RelationalPropertyDescriptor>(entity, propertyPath, {
      enumerable: true,
      get() {
        log(`get "${propertyPath}"`, relation)

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

        log(`resolved "${relation.kind}" "${propertyPath}" to`, refValue)

        return relation.kind === RelationKind.OneOf
          ? first(refValue)!
          : refValue
      },
    })

    log('relation "%s" successfuly set!', propertyPath)
  }
}
