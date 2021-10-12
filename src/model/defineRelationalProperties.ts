import { debug } from 'debug'
import get from 'lodash/get'
import set from 'lodash/set'
import { invariant } from 'outvariant'
import { Database } from '../db/Database'
import {
  Entity,
  InternalEntity,
  InternalEntityProperty,
  ModelDictionary,
  Value,
} from '../glossary'
import { executeQuery } from '../query/executeQuery'
import { first } from '../utils/first'
import { definePropertyAtPath } from '../utils/definePropertyAtPath'
import {
  ProducedRelationsMap,
  ProducedRelation,
  RelationKind,
} from '../relations/Relation'
import { QuerySelectorWhere } from '../query/queryTypes'

const log = debug('defineRelationalProperties')

export function defineRelationalProperties(
  entity: InternalEntity<any, any>,
  initialValues: Partial<Value<any, ModelDictionary>>,
  relations: ProducedRelationsMap,
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
          where: set<QuerySelectorWhere<any>>({}, propertyPath, {
            [relation.primaryKey]: {
              in: entityRefs.map((entityRef) => {
                return entityRef[relation.primaryKey]
              }),
            },
          }),
        },
        db,
      )

      log(
        `existing entities that reference the same "${propertyPath}"`,
        existingEntities,
      )

      invariant(
        existingEntities.length === 0,
        'Failed to create a unique "%s" relation for "%s" (%s): the provided entity is already used.',
        relation.modelName,
        `${entity.__type}.${propertyPath}`,
        entity[entity[InternalEntityProperty.primaryKey]],
      )
    }

    addRelation(entity, propertyPath, relation, entityRefs, db)

    log('relation "%s" successfuly set!', propertyPath)
  }
}

export function addRelation(
  entity: Entity<any, any>,
  propertyPath: string,
  relation: ProducedRelation,
  references: Value<any, any> | Value<any, any>[],
  db: Database<any>,
): void {
  const entityType = entity[InternalEntityProperty.type]
  const referencesList = ([] as Value<any, any>[]).concat(references)
  const referencedModels = db.getModel(relation.modelName)

  log(
    'adding a "%s" relational property "%s" on "%s" (%j)',
    relation.kind,
    propertyPath,
    entityType,
    references,
  )
  log(
    'database records for the referenced "%s" model:',
    relation.modelName,
    referencedModels,
  )

  // All referenced entities must exist.
  // This also guards against providing compatible plain objects as next values,
  // because they won't have the corresponding records in the database.
  referencesList.forEach((reference) => {
    const referenceId = reference[relation.primaryKey]
    invariant(
      referencedModels.has(referenceId),
      'Failed to add relational property "%s" on "%s": referenced entity with the id "%s" does not exist.',
      propertyPath,
      entityType,
      referenceId,
    )
  })

  definePropertyAtPath(entity, propertyPath, {
    enumerable: true,
    // Mark the property as configurable so that it can be re-defined.
    // Relational properties may be re-defined when updated during the
    // entity update ("update"/"updateMany").
    configurable: true,
    get() {
      log(`get "${propertyPath}"`, relation)

      const queryResult = referencesList.reduce<InternalEntity<any, any>[]>(
        (result, entityRef) => {
          return result.concat(
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

      log(`resolved "${relation.kind}" "${propertyPath}" to`, queryResult)

      return relation.kind === RelationKind.OneOf
        ? first(queryResult)
        : queryResult
    },
  })
}
