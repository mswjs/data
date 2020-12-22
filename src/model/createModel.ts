import { v4 } from 'uuid'
import { debug } from 'debug'
import {
  Database,
  InternalEntityProperties,
  ModelDictionary,
  PrimaryKeyType,
  Value,
} from '../glossary'
import { defineRelationalProperties } from './defineRelationalProperties'

const log = debug('createModel')

export function createModel<
  Dictionary extends ModelDictionary,
  ModelName extends string
>(
  modelName: ModelName,
  primaryKey: PrimaryKeyType,
  properties: Value<Dictionary[ModelName], Dictionary>,
  relations: Record<string, any>,
  db: Database,
) {
  log('creating model', modelName, primaryKey, properties, relations)

  const internalProperties: InternalEntityProperties<ModelName> = {
    __type: modelName,
    __nodeId: v4(),
    __primaryKey: primaryKey,
  }
  const model = Object.assign({}, properties, internalProperties)
  defineRelationalProperties(model, relations, db)

  log(`created "${modelName}" model`, model)

  return model
}
