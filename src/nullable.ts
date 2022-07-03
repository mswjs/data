import { ModelValueType } from './glossary'
import { ManyOf, OneOf, Relation, RelationKind } from './relations/Relation'
import { isObject } from './utils/isObject'

export type NullableGetter<ValueType extends ModelValueType> =
  () => ValueType | null

export class NullableProperty<ValueType extends ModelValueType> {
  public getValue: NullableGetter<ValueType>
  // Indicates if needs to generate nested object properties when getter returns object
  public isGetterFunctionReturningObject: boolean

  constructor(getter: NullableGetter<ValueType>) {
    this.getValue = getter
    this.isGetterFunctionReturningObject = isObject(getter())
  }
}

export function nullable<ValueType extends ModelValueType>(
  value: NullableGetter<ValueType>,
): NullableProperty<ValueType>

export function nullable<
  ValueType extends Relation<any, any, any, { nullable: false }>,
>(
  value: ValueType,
): ValueType extends Relation<infer Kind, infer Key, any, { nullable: false }>
  ? Kind extends RelationKind.ManyOf
    ? ManyOf<Key, true>
    : OneOf<Key, true>
  : never

export function nullable(
  value:
    | NullableGetter<ModelValueType>
    | Relation<any, any, any, { nullable: false }>,
) {
  if (typeof value === 'function') {
    return new NullableProperty(value)
  }

  return new Relation({
    kind: value.kind,
    to: value.target.modelName,
    attributes: {
      ...value.attributes,
      nullable: true,
    },
  })
}
