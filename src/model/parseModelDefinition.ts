import { debug } from 'debug'
import { ModelDefinition, PrimaryKeyType, ModelDictionary } from '../glossary'
import { PrimaryKey } from '../primaryKey'
import { invariant } from '../utils/invariant'
import { isObject } from '../utils/isObject'
import { Relation, ProducedRelationsMap } from '../relations/Relation'

const log = debug('parseModelDefinition')

export interface ParsedModelDefinition {
  primaryKey: PrimaryKeyType
  properties: string[]
  relations: ProducedRelationsMap
}

/**
 * Recursively parses a given model definition into properties and relations.
 */
function deepParseModelDefinition<Dictionary extends ModelDictionary>(
  dictionary: Dictionary,
  modelName: string,
  definition: ModelDefinition,
  parentPath?: string,
  result: ParsedModelDefinition = {
    primaryKey: undefined!,
    properties: [],
    relations: {},
  },
) {
  if (parentPath) {
    log(
      'parsing a nested model definition for "%s" property at "%s"',
      parentPath,
      modelName,
      definition,
    )
  }

  for (const [property, value] of Object.entries(definition)) {
    const propertyPath = parentPath ? `${parentPath}.${property}` : property

    // Primary key.
    if (value instanceof PrimaryKey) {
      invariant(
        !result.primaryKey,
        `Failed to parse a model definition for "${modelName}": cannot have both properties "${result.primaryKey}" and "${property}" as a primary key.`,
      )

      invariant(
        !parentPath,
        `Failed to parse a model definition for "${parentPath}" property of "${modelName}": cannot have a primary key in a nested object.`,
      )

      result.primaryKey = property
      result.properties.push(property)

      continue
    }

    // Relations.
    if (value instanceof Relation) {
      // Resolve a relation against the dictionary to collect
      // the primary key names of the referenced models.
      result.relations[propertyPath] = value.produce(dictionary)
      continue
    }

    // Nested objects.
    if (isObject(value)) {
      deepParseModelDefinition(
        dictionary,
        modelName,
        /**
         * @fixme Extend the "ModelDefinition" type to denote nested objects as values.
         */
        value as any,
        propertyPath,
        result,
      )

      continue
    }

    // Regular properties.
    result.properties.push(propertyPath)
  }

  return result
}

export function parseModelDefinition<Dictionary extends ModelDictionary>(
  dictionary: Dictionary,
  modelName: string,
  definition: ModelDefinition,
): ParsedModelDefinition {
  log('parsing model definition for "%s" entity', modelName, definition)
  const result = deepParseModelDefinition(dictionary, modelName, definition, '')

  invariant(
    result.primaryKey,
    `Failed to parse a model definition for "${modelName}": model is missing a primary key. Did you forget to mark one of its properties using the "primaryKey" function?`,
  )

  return result
}
