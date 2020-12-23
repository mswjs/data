import { PrimaryKeyType } from '../glossary'

class DuplicateKeyError<ModelName extends string> extends Error {
  constructor(
    modelName: ModelName,
    primaryKeyName: string,
    key: PrimaryKeyType,
  ) {
    super(
      `Failed to execute "update" on the "${modelName}" model: the entity with a primary key "${key}" ("${primaryKeyName}") already exists.`,
    )
  }
}

export default DuplicateKeyError
