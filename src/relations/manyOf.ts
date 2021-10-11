import { Relation, RelationKind, RelationOptions, ManyOf } from './Relation'

export function manyOf<ModelName extends string>(
  modelName: ModelName,
  options?: RelationOptions,
): ManyOf<ModelName> {
  return new Relation({
    to: modelName,
    kind: RelationKind.ManyOf,
    unique: options?.unique,
  })
}
