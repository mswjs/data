import { debug } from 'debug'
import {
  InternalEntityProperties,
  ModelDictionary,
  PrimaryKeyType,
  Value,
} from '../glossary'
import { defineRelationalProperties } from './defineRelationalProperties'
import { Database } from '../db/Database'

const log = debug('createModel')

export function createModel<
  Dictionary extends ModelDictionary,
  ModelName extends string
>(
  modelName: ModelName,
  primaryKey: PrimaryKeyType,
  properties: Value<Dictionary[ModelName], Dictionary>,
  relations: Record<string, any>,
  db: Database<Dictionary>,
) {
  log(
    `creating model "${modelName}" (primary key: "${primaryKey}")`,
    properties,
    relations,
  )

  const internalProperties: InternalEntityProperties<ModelName> = {
    __type: modelName,
    __primaryKey: primaryKey,
  }
  const model = Object.assign({}, properties, internalProperties)
  defineRelationalProperties(model, relations, db)

  log(`created "${modelName}" model`, model)

  return model
}
