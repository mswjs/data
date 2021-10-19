import { debug } from 'debug'
import get from 'lodash/get'
import set from 'lodash/set'
import isFunction from 'lodash/isFunction'
import { Database } from '../db/Database'
import {
  ENTITY_TYPE,
  Entity,
  InternalEntityProperties,
  ModelDefinition,
  ModelDictionary,
  PRIMARY_KEY,
  Value,
} from '../glossary'
import { ParsedModelDefinition } from './parseModelDefinition'
import { defineRelationalProperties } from './defineRelationalProperties'
import { PrimaryKey } from '../primaryKey'
import { Relation } from '../relations/Relation'

const log = debug('createModel')

export function createModel<
  Dictionary extends ModelDictionary,
  ModelName extends string,
>(
  modelName: ModelName,
  definition: ModelDefinition,
  dictionary: Dictionary,
  parsedModel: ParsedModelDefinition,
  initialValues: Partial<Value<Dictionary[ModelName], Dictionary>>,
  db: Database<Dictionary>,
): Entity<Dictionary, ModelName> {
  const { primaryKey, properties, relations } = parsedModel

  log(
    `creating a "${modelName}" entity (primary key: "${primaryKey}")`,
    definition,
    parsedModel,
    relations,
    initialValues,
  )

  const internalProperties: InternalEntityProperties<ModelName> = {
    [ENTITY_TYPE]: modelName,
    [PRIMARY_KEY]: primaryKey,
  }

  const publicProperties = properties.reduce<Record<string, unknown>>(
    (properties, propertyName) => {
      const initialValue = get(initialValues, propertyName)
      const propertyDefinition = get(definition, propertyName)

      // Ignore relational properties at this stage.
      if (propertyDefinition instanceof Relation) {
        return properties
      }

      if (propertyDefinition instanceof PrimaryKey) {
        set(
          properties,
          propertyName,
          initialValue || propertyDefinition.getValue(),
        )
        return properties
      }

      if (
        typeof initialValue === 'string' ||
        typeof initialValue === 'number' ||
        typeof initialValue === 'boolean' ||
        // @ts-ignore
        initialValue?.constructor.name === 'Date' ||
        Array.isArray(initialValue)
      ) {
        log(
          '"%s" has a plain initial value:',
          `${modelName}.${propertyName}`,
          initialValue,
        )
        set(properties, propertyName, initialValue)
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

  const entity = Object.assign(
    {},
    publicProperties,
    internalProperties,
  ) as Entity<Dictionary, ModelName>

  defineRelationalProperties(entity, initialValues, relations, dictionary, db)

  log('created "%s" entity:', modelName, entity)

  return entity
}
