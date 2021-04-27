import { PrimaryKeyDeclaration, PrimaryKeyType } from './glossary'

export function primaryKey<ValueType extends PrimaryKeyType>(
  getValue: () => ValueType,
): PrimaryKeyDeclaration<ValueType> {
  return {
    isPrimaryKey: true,
    getValue,
  }
}
