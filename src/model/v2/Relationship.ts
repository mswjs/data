import { TokenAttributes } from './Token'

export enum RelationKind {
  OneOf = 'oneOf',
  ManyOf = 'manyOf',
}

export interface RelationshipInput<Kind extends RelationKind> {
  kind: Kind
}

export class Relationship<
  Kind extends RelationKind,
> extends TokenAttributes<any> {
  public readonly kind: Kind

  constructor(input: RelationshipInput<Kind>) {
    super(() => this)
    this.kind = input.kind
  }
}

export function oneOf(modelName: string) {
  //
}
