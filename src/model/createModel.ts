import { v4 } from 'uuid'
import { Database, InternalEntityProperties } from '../glossary'
import { defineRelationalProperties } from './defineRelationalProperties'

export function createModel<ModelName extends string>(
  modelName: ModelName,
  properties: Record<string, any>,
  relations: Record<string, any>,
  db: Database<any>
) {
  const internalProperties: InternalEntityProperties<ModelName> = {
    __type: modelName,
    __nodeId: v4(),
  }
  const model = Object.assign({}, properties, internalProperties)
  defineRelationalProperties(model, relations, db)

  return model
}
