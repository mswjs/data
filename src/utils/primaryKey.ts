import { PrimaryKeyTypes, PrimaryKey } from '../glossary'

export function primaryKey(defaultValue: () => PrimaryKeyTypes): PrimaryKey {
  return {
    primaryKey: true,
    defaultValue,
  }
}
