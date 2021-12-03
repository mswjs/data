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
import { Relation, RelationsList } from '../relations/Relation'

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

    const references: Value<any, ModelDictionary> | null | undefined = get(
      initialValues,
      propertyPath,
    )

    invariant(
      references !== null || relation.attributes.nullable,
      'Failed to define a "%s" relationship to "%s" at "%s.%s" (%s: "%s"): cannot set a non-nullable relationship to null.',

      relation.kind,
      relation.target.modelName,
      entity[ENTITY_TYPE],
      propertyPath.join('.'),
      entity[PRIMARY_KEY],
      entity[entity[PRIMARY_KEY]],
    )

    // invariant(
    //   references !== null || relation.attributes.nullable,
    //   'Failed to define a "%s" relational property to "%s" on "%s": a non-nullable relation cannot be instantiated with null. Use the "nullable" function when defining this relation to support nullable value.',
    //   relation.kind,
    //   propertyPath.join('.'),
    //   entity[ENTITY_TYPE],
    // )

    log(
      `setting relational property "${entity.__type}.${propertyPath.join(
        '.',
      )}" with references: %j`,
      relation,
      references,
    )

    relation.apply(entity, propertyPath, dictionary, db)

    if (references) {
      relation.resolveWith(entity, references)
    } else if (relation.attributes.nullable) {
      relation.resolveWith(entity, null)
    }
  }
}
