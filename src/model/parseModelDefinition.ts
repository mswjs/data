import { debug } from 'debug'
import { invariant } from 'outvariant'
import {
  ModelDefinition,
  PrimaryKeyType,
  ModelDictionary,
  NestedModelDefinition,
} from '../glossary'
import { PrimaryKey } from '../primaryKey'
import { isObject } from '../utils/isObject'
import { Relation, RelationsMap } from '../relations/Relation'

const log = debug('parseModelDefinition')

export interface ParsedModelDefinition {
  primaryKey: PrimaryKeyType
  properties: string[]
  relations: RelationsMap
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

  for (const [propertyName, value] of Object.entries(definition)) {
    const propertyPath = parentPath
      ? `${parentPath}.${propertyName}`
      : propertyName

    // Primary key.
    if (value instanceof PrimaryKey) {
      invariant(
        !result.primaryKey,
        'Failed to parse a model definition for "%s": cannot have both properties "%s" and "%s" as a primary key.',
        modelName,
        result.primaryKey,
        propertyName,
      )

      invariant(
        !parentPath,
        'Failed to parse a model definition for "%s" property of "%s": cannot have a primary key in a nested object.',
        parentPath,
        modelName,
      )

      result.primaryKey = propertyName
      result.properties.push(propertyName)

      continue
    }

    // Relations.
    if (value instanceof Relation) {
      // Store the relations in a separate object.
      result.relations[propertyPath] = value
      continue
    }

    // Nested objects.
    if (isObject<NestedModelDefinition>(value)) {
      deepParseModelDefinition(
        dictionary,
        modelName,
        value,
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
    'Failed to parse a model definition for "%s": model is missing a primary key. Did you forget to mark one of its properties using the "primaryKey" function?',
    modelName,
  )

  return result
}
