import { debug } from 'debug'
import {
  Relation,
  RelationKind,
  ModelDefinition,
  PrimaryKeyType,
} from '../glossary'
import { invariant } from '../utils/invariant'

const log = debug('parseModelDefinition')

export interface ParsedModelDefinition {
  primaryKey: PrimaryKeyType
  properties: string[]
  relations: Record<string, Relation>
}

export function parseModelDefinition(
  modelName: string,
  definition: ModelDefinition,
): ParsedModelDefinition {
  log(`parsing model definition for "${modelName}" entity`, definition)

  const result = Object.entries(definition).reduce<{
    primaryKey: string
    properties: string[]
    relations: Record<string, Relation>
  }>(
    (result, [property, valueGetter]) => {
      if ('isPrimaryKey' in valueGetter) {
        invariant(
          result.primaryKey,
          `Failed to parse a model definition for "${modelName}": cannot have both properties "${result.primaryKey}" and "${property}" as a primary key.`,
        )

        result.primaryKey = property
        result.properties.push(property)
        return result
      }

      if (
        'kind' in valueGetter &&
        [RelationKind.OneOf, RelationKind.ManyOf].includes(valueGetter.kind)
      ) {
        result.relations[property] = {
          kind: valueGetter.kind,
          modelName: valueGetter.modelName,
          unique: valueGetter.unique,
        }

        return result
      }

      result.properties.push(property)
      return result
    },
    {
      primaryKey: undefined!,
      properties: [],
      relations: {},
    },
  )

  if (!result.primaryKey) {
    throw new Error(
      `Failed to parse a model definition for "${modelName}": no provided properties are marked as a primary key (${result.properties.join(
        ', ',
      )}).`,
    )
  }

  return result
}
