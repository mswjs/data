import { ManyOf, Relation, RelationAttributes, RelationKind } from './Relation'

export function manyOf<ModelName extends string>(
  to: ModelName,
  attributes?: Partial<RelationAttributes>,
): ManyOf<ModelName> {
  return new Relation({
    to,
    kind: RelationKind.ManyOf,
    attributes,
  })
}
