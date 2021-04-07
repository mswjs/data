import { ManyOf, RelationKind, RelationOptions } from '../glossary'

export function manyOf<ModelName extends string>(
  modelName: ModelName,
  options?: RelationOptions,
): ManyOf<ModelName> {
  return {
    kind: RelationKind.ManyOf,
    modelName,
    unique: !!options?.unique,
  }
}
