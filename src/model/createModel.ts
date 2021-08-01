import { debug } from 'debug'
import get from 'lodash/get'
import set from 'lodash/set'
import isFunction from 'lodash/isFunction'
import { Database } from '../db/Database'
import {
  InternalEntity,
  InternalEntityProperties,
  InternalEntityProperty,
  ModelDefinition,
  ModelDictionary,
  Value,
} from '../glossary'
import { ParsedModelDefinition } from './parseModelDefinition'
import { defineRelationalProperties } from './defineRelationalProperties'

const log = debug('createModel')

export function createModel<
  Dictionary extends ModelDictionary,
  ModelName extends string,
>(
  modelName: ModelName,
  definition: ModelDefinition,
  parsedModel: ParsedModelDefinition,
  initialValues: Partial<Value<Dictionary[ModelName], Dictionary>>,
  db: Database<Dictionary>,
): InternalEntity<any, any> {
  const { primaryKey, properties, relations } = parsedModel

  log(
    `creating a "${modelName}" entity (primary key: "${primaryKey}")`,
    definition,
    parsedModel,
    relations,
    initialValues,
  )

  // Internal properties that allow identifying this model
  // when referenced in other models (i.e. via relatioships).
  const internalProperties: InternalEntityProperties<ModelName> = {
    [InternalEntityProperty.type]: modelName,
    [InternalEntityProperty.primaryKey]: primaryKey,
  }

  const publicProperties = properties.reduce<Record<string, unknown>>(
    (properties, propertyName) => {
      const value = get(initialValues, propertyName)
      const propertyDefinition = get(definition, propertyName)

      // Ignore relational properties at this stage.
      if ('kind' in propertyDefinition) {
        return properties
      }

      if ('isPrimaryKey' in propertyDefinition) {
        set(properties, propertyName, value || propertyDefinition.getValue())
        return properties
      }

      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        value?.constructor.name === 'Date' ||
        Array.isArray(value)
      ) {
        log(
          '"%s" has a plain initial value:',
          `${modelName}.${propertyName}`,
          value,
        )
        set(properties, propertyName, value)
        return properties
      }

      if (isFunction(propertyDefinition)) {
        set(properties, propertyName, propertyDefinition())
        return properties
      }

      return properties
    },
    {},
  )

  const entity = Object.assign({}, publicProperties, internalProperties)
  defineRelationalProperties(entity, initialValues, relations, db)

  log('created "%s" entity', modelName, entity)

  return entity
}
