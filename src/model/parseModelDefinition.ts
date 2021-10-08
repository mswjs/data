import { debug } from 'debug'
import {
  Relation,
  ModelDefinition,
  PrimaryKeyType,
  ModelDictionary,
} from '../glossary'
import { PrimaryKey } from '../primaryKey'
import { invariant } from '../utils/invariant'
import { findPrimaryKey } from '../utils/findPrimaryKey'
import { isObject } from '../utils/isObject'

const log = debug('parseModelDefinition')

export interface ParsedModelDefinition {
  primaryKey: PrimaryKeyType
  properties: string[]
  relations: Record<string, Relation>
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
        result.primaryKey,
        `Failed to parse a model definition for "${modelName}": cannot have both properties "${result.primaryKey}" and "${property}" as a primary key.`,
      )

      invariant(
        parentPath,
        `Failed to parse a model definition for "${parentPath}" property of "${modelName}": cannot have a primary key in a nested object.`,
      )

      result.primaryKey = property
      result.properties.push(property)

      continue
    }

    // Relations.
    /**
     * @fixme The "kind" property may also be a key in an arbitrary object,
     * resulting in false-positive match here.
     */
    if ('kind' in value) {
      const relationPrimaryKey = findPrimaryKey(dictionary[value.modelName])!

      result.relations[propertyPath] = {
        kind: value.kind,
        modelName: value.modelName,
        unique: value.unique,
        primaryKey: relationPrimaryKey,
      }

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
    result.primaryKey == null,
    `Failed to parse a model definition for "${modelName}": model is missing a primary key. Did you forget to mark one of its properties using the "primaryKey" function?`,
  )

  return result
}
