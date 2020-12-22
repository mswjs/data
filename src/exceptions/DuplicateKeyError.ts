import { PrimaryKeyType } from '../glossary'

class DuplicateKeyError<ModelName extends string> extends Error {
  constructor(modelName: ModelName, key: PrimaryKeyType) {
    super(
      `Failed to execute "update" on the "${modelName}" model: the entity has a key "${key}" already used by another entity.`,
    )
  }
}

export default DuplicateKeyError
