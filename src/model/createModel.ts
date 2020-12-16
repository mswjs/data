import { v4 } from 'uuid'
import { debug } from 'debug'
import {
  Database,
  InternalEntityProperties,
  ModelDictionary,
  EntityInstance,
  Value,
} from '../glossary'
import { defineRelationalProperties } from './defineRelationalProperties'

const log = debug('createModel')

export function createModel<
  Dictionary extends ModelDictionary,
  ModelName extends string
>(
  modelName: ModelName,
  properties: Value<Dictionary[ModelName], Dictionary>,
  relations: Record<string, any>,
  db: Database<EntityInstance<Dictionary, ModelName>>,
) {
  log('creating model', modelName, properties, relations)

  const internalProperties: InternalEntityProperties<ModelName> = {
    __type: modelName,
    __nodeId: v4(),
  }
  const model = Object.assign({}, properties, internalProperties)
  defineRelationalProperties(model, relations, db)

  log(`created "${modelName}" model`, model)

  return model
}
