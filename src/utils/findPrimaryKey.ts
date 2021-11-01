import { ModelDefinition, PrimaryKeyType } from '../glossary'
import { PrimaryKey } from '../primaryKey'

/**
 * Returns a primary key property name of the given model definition.
 */
export function findPrimaryKey(
  definition: ModelDefinition,
): PrimaryKeyType | undefined {
  for (const propertyName in definition) {
    const value = definition[propertyName]

    if (value instanceof PrimaryKey) {
      return propertyName
    }
  }
}
