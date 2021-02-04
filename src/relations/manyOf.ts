import { ManyOf, RelationKind } from '../glossary'

export function manyOf<ModelName extends string>(
  modelName: ModelName,
): ManyOf<ModelName> {
  return {
    kind: RelationKind.ManyOf,
    modelName,
  }
}
