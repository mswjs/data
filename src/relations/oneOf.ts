import { OneOf, RelationKind } from '../glossary'

export function oneOf<ModelName extends string>(
  modelName: ModelName,
): OneOf<ModelName> {
  return {
    kind: RelationKind.OneOf,
    modelName,
  }
}
