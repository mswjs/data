import { debug } from 'debug'
import { Database } from '../db/Database'
import {
  InternalEntity,
  InternalEntityProperties,
  ModelDefinition,
  ModelDictionary,
  Value,
} from '../glossary'
import { ParsedModelDefinition } from './parseModelDefinition'
import { defineRelationalProperties } from './defineRelationalProperties'

const log = debug('createModel')

export function createModel<
  Dictionary extends ModelDictionary,
  ModelName extends string
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

  const internalProperties: InternalEntityProperties<ModelName> = {
    __type: modelName,
    __primaryKey: primaryKey,
  }

  const resolvedProperties = properties.reduce<Record<string, any>>(
    (entity, property) => {
      const exactValue = initialValues[property]
      const propertyDefinition = definition[property]

      log(
        `property definition for "${modelName}.${property}"`,
        propertyDefinition,
      )

      // Ignore relational properties at this stage.
      if ('kind' in propertyDefinition) {
        return entity
      }

      if ('isPrimaryKey' in propertyDefinition) {
        entity[property] = exactValue || propertyDefinition.getValue()
        return entity
      }

      if (
        typeof exactValue === 'string' ||
        typeof exactValue === 'number' ||
        typeof exactValue === 'boolean' ||
        exactValue?.constructor.name === 'Date'
      ) {
        log(`"${modelName}.${property}" has a plain initial value:`, exactValue)
        entity[property] = exactValue
        return entity
      }

      entity[property] = propertyDefinition()
      return entity
    },
    {},
  )

  // const two = Object.entries(relations).reduce(
  //   (entity, [property, relation]) => {
  //     const entityRef = initialValues[property]!

  //     invariant(
  //       entityRef,
  //       `Failed to set "${modelName}.${property}" relational property: expected an initial value, but got: ${exactVaentityReflue}`,
  //     )

  //     entityRef

  //     return entity
  //   },
  //   foo,
  // )

  const entity = Object.assign({}, resolvedProperties, internalProperties)
  defineRelationalProperties(entity, initialValues, relations, db)

  log(`created "${modelName}" entity`, entity)

  return entity
}
