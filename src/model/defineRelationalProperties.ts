import { debug } from 'debug'
import get from 'lodash/get'
import { Database } from '../db/Database'
import { InternalEntity, ModelDictionary, Value } from '../glossary'
import { RelationsMap } from '../relations/Relation'

const log = debug('defineRelationalProperties')

export function defineRelationalProperties(
  entity: InternalEntity<any, any>,
  initialValues: Partial<Value<any, ModelDictionary>>,
  relations: RelationsMap,
  dictionary: ModelDictionary,
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

    const references: Value<any, ModelDictionary> = get(
      initialValues,
      propertyPath,
    )
    relation.apply(entity, propertyPath, references, dictionary, db)
  }
}
