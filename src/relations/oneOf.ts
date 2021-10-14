import { OneOf, Relation, RelationAttributes, RelationKind } from './Relation'

export function oneOf<ModelName extends string>(
  to: ModelName,
  attributes?: Partial<RelationAttributes>,
): OneOf<ModelName> {
  return new Relation({
    to,
    kind: RelationKind.OneOf,
    attributes,
  })
}
