import { v4 } from 'uuid'
import { debug } from 'debug'
import { Database, InternalEntityProperties } from '../glossary'
import { defineRelationalProperties } from './defineRelationalProperties'

const log = debug('createModel')

export function createModel<ModelName extends string>(
  modelName: ModelName,
  properties: Record<string, any>,
  relations: Record<string, any>,
  db: Database<any>,
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
