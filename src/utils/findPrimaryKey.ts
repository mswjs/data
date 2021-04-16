import { ModelDefinition, PrimaryKeyType } from '../glossary'

/**
 * Returns a primary key property name of the given model definition.
 */
export function findPrimaryKey(
  definition: ModelDefinition,
): PrimaryKeyType | undefined {
  for (const propertyName in definition) {
    const values = definition[propertyName]

    if ('isPrimaryKey' in values) {
      return propertyName
    }
  }
}
