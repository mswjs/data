import { debug } from 'debug'
import { invariant } from 'outvariant'
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
import { NullableObject, NullableProperty } from '../nullable'
import { isModelValueType } from '../utils/isModelValueType'
import { getDefinition } from './getDefinition'

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
      const propertyDefinition = getDefinition(definition, propertyName)

      // Ignore relational properties at this stage.
      if (propertyDefinition instanceof Relation) {
        return properties
      }

      if (propertyDefinition instanceof PrimaryKey) {
        set(
          properties,
          propertyName,
          initialValue || propertyDefinition.getPrimaryKeyValue(),
        )
        return properties
      }

      if (propertyDefinition instanceof NullableProperty) {
        const value =
          initialValue === null || isModelValueType(initialValue)
            ? initialValue
            : propertyDefinition.getValue()

        set(properties, propertyName, value)
        return properties
      }

      if (propertyDefinition instanceof NullableObject) {
        if (initialValue === null) {
          // in case the initial value of the nullable object is null, we want
          // to override the inner values of the object and set the
          // object itself to be null
          set(properties, propertyName, null)
        } else if (propertyDefinition.getValue() === null) {
          // in case the definition of the nullable object defaults to null
          const valueToInitialize =
            initialValue === undefined ? null : initialValue
          set(properties, propertyName, valueToInitialize)
        }
        return properties
      }

      invariant(
        initialValue !== null,
        'Failed to create a "%s" entity: a non-nullable property "%s" cannot be instantiated with null. Use the "nullable" function when defining this property to support nullable value.',
        modelName,
        propertyName.join('.'),
      )

      if (isModelValueType(initialValue)) {
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
