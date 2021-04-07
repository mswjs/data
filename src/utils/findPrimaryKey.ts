import { ModelDeclaration, PrimaryKeyType } from '../glossary'

/**
 * Returns a primary key property name of the given model declaration.
 */
export function findPrimaryKey(
  declaration: ModelDeclaration,
): PrimaryKeyType | undefined {
  for (const propName in declaration) {
    const props = declaration[propName]

    if ('isPrimaryKey' in props) {
      return propName
    }
  }
}
