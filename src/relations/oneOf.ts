import { OneOf, RelationKind } from '../glossary'

export function oneOf<T extends string>(modelName: T): OneOf<T> {
  return {
    __type: RelationKind.OneOf,
    modelName,
  }
}
