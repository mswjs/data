import { AnyObject, ModelDefinition, ModelValueType } from './glossary'
import { ManyOf, OneOf, Relation, RelationKind } from './relations/Relation'
import { isObject } from './utils/isObject'

export type NullableGetter<ValueType extends ModelValueType> =
  () => ValueType | null

export class NullableProperty<ValueType extends ModelValueType> {
  public getValue: NullableGetter<ValueType>

  constructor(getter: NullableGetter<ValueType>) {
    this.getValue = getter
  }
}

export type NullableObject<ValueType extends AnyObject> = ValueType | null

export class NullableObjectProperty<ValueType extends AnyObject> {
  public value: ValueType | null

  constructor(value: NullableObject<ValueType>) {
    this.value = value
  }
}

export function nullable<ValueType extends ModelValueType>(
  value: NullableGetter<ValueType>,
): NullableProperty<ValueType>

export function nullable<ValueType extends AnyObject>(
  value: NullableObject<ValueType>,
): NullableObjectProperty<ValueType>

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
    | NullableObject<AnyObject>
    | NullableGetter<ModelValueType>
    | Relation<any, any, any, { nullable: false }>,
) {
  if (isObject(value)) {
    return new NullableObjectProperty(value)
  }

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
