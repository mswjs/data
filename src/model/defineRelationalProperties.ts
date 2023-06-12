import { debug } from 'debug'
import get from 'lodash/get'
import { invariant } from 'outvariant'
import { Database } from '../db/Database'
import {
  Entity,
  ENTITY_TYPE,
  ModelDictionary,
  PRIMARY_KEY,
  Value,
} from '../glossary'
import { Relation, RelationKind, RelationsList } from '../relations/Relation'

const log = debug('defineRelationalProperties')

const getInvariantMessagePrefix = (
  entity: Entity<any, any>,
  relation: Relation<any, any, any, any>,
  propertyPath: string[],
) =>
  `Failed to define a "${relation.kind}" relationship to "${
    relation.target.modelName
  }" at "${entity[ENTITY_TYPE]}.${propertyPath.join('.')}" (${
    entity[PRIMARY_KEY]
  }: "${entity[entity[PRIMARY_KEY]]}")`

export function defineRelationalProperties(
  entity: Entity<any, any>,
  initialValues: Partial<Value<any, ModelDictionary>>,
  relations: RelationsList,
  dictionary: ModelDictionary,
  db: Database<any>,
): void {
  log('defining relational properties...', { entity, initialValues, relations })

  for (const { propertyPath, relation } of relations) {
    const invariantMessagePrefix = getInvariantMessagePrefix(
      entity,
      relation,
      propertyPath,
    )

    invariant(
      dictionary[relation.target.modelName],
      `${invariantMessagePrefix}: cannot find a model by the name "%s".`,
      relation.target.modelName,
    )

    const references: Value<any, ModelDictionary> | null | undefined = get(
      initialValues,
      propertyPath,
    )

    invariant(
      references !== null || relation.attributes.nullable,
      `${invariantMessagePrefix}: cannot set a non-nullable relationship to null.`,
    )

    invariant(
      relation.kind !== RelationKind.OneOf ||
        references !== undefined ||
        relation.attributes.nullable,
      `${invariantMessagePrefix}: a value must be provided for a non-nullable relationship.`,
    )

    log(
      `setting relational property "${entity[ENTITY_TYPE]}.${propertyPath.join(
        '.',
      )}" with references: %j`,
      references,
      relation,
    )

    relation.apply(entity, propertyPath, dictionary, db)

    if (references) {
      log('has references, applying a getter...')
      relation.resolveWith(entity, references)
      continue
    }

    if (relation.attributes.nullable) {
      log('has no references but is nullable, applying a getter to null...')
      relation.resolveWith(entity, null)
      continue
    }

    if (relation.kind === RelationKind.ManyOf) {
      log(
        'has no references but is a non-nullable "manyOf" relationship, applying a getter to []...',
      )
      relation.resolveWith(entity, [])
      continue
    }

    log('has no relations, skipping the getter...')
  }
}
