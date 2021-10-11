import { Relation, RelationKind, RelationOptions, OneOf } from './Relation'

export function oneOf<ModelName extends string>(
  modelName: ModelName,
  options?: RelationOptions,
): OneOf<ModelName> {
  return new Relation({
    to: modelName,
    kind: RelationKind.OneOf,
    unique: options?.unique,
  })
}
