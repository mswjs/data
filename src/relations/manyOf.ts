import { ManyOf, RelationKind } from '../glossary'

export function manyOf<T extends string>(modelName: T): ManyOf<T> {
  return {
    __type: RelationKind.ManyOf,
    modelName,
  }
}
