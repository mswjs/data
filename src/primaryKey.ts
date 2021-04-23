import { PrimaryKeyDeclaration, KeyType } from './glossary'

export function primaryKey(getValue: () => KeyType): PrimaryKeyDeclaration {
  return {
    isPrimaryKey: true,
    getValue,
  }
}
