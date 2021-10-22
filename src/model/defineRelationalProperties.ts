import { debug } from 'debug'
import get from 'lodash/get'
import { invariant } from 'outvariant'
import { Database } from '../db/Database'
import { Entity, ENTITY_TYPE, ModelDictionary, Value } from '../glossary'
import { RelationsList } from '../relations/Relation'

const log = debug('defineRelationalProperties')

export function defineRelationalProperties(
  entity: Entity<any, any>,
  initialValues: Partial<Value<any, ModelDictionary>>,
  relations: RelationsList,
  dictionary: ModelDictionary,
  db: Database<any>,
): void {
  log('defining relational properties...', { entity, initialValues, relations })

  for (const { propertyPath, relation } of relations) {
    invariant(
      dictionary[relation.target.modelName],
      'Failed to define a "%s" relational property to "%s" on "%s": cannot find a model by the name "%s".',
      relation.kind,
      propertyPath.join('.'),
      entity[ENTITY_TYPE],
      relation.target.modelName,
    )

    const references: Value<any, ModelDictionary> | undefined = get(
      initialValues,
      propertyPath,
    )

    log(
      `setting relational property "${entity.__type}.${propertyPath.join('.')}" with references: %j`,
      relation,
      references,
    )

    relation.apply(entity, propertyPath, dictionary, db)

    if (references) {
      relation.resolveWith(entity, references)
    } else if (relation.nullable) {
      relation.resolveWith(entity, null)
    }
  }
}
