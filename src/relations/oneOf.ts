import { OneOf, RelationKind, RelationOptions } from '../glossary'

export function oneOf<ModelName extends string>(
  modelName: ModelName,
  options?: RelationOptions,
): OneOf<ModelName> {
  return {
    kind: RelationKind.OneOf,
    modelName,
    unique: options?.unique,
  }
}
