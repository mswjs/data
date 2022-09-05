import { OneOf, Relation, RelationAttributes, RelationKind } from './Relation'

export function oneOf<ModelName extends string, Nullable extends boolean = false>(
  to: ModelName,
  attributes?: Partial<RelationAttributes<Nullable>>,
): OneOf<ModelName, Nullable> {
  return new Relation({
    to,
    kind: RelationKind.OneOf,
    attributes,
  })
}
