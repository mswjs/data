import { PrimaryKeyDeclaration, PrimaryKeyType } from './glossary'

export function primaryKey(
  getValue: () => PrimaryKeyType,
): PrimaryKeyDeclaration {
  return {
    isPrimaryKey: true,
    getValue,
  }
}
