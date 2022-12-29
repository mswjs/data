import { ModelValueType, NullableNestedModelDefinition } from './glossary'
import { ManyOf, OneOf, Relation, RelationKind } from './relations/Relation'
import { isObject } from './utils/isObject'

export type NullableNestedGetter<
  ValueType extends NullableNestedModelDefinition,
> = () => ValueType | null

export class NullableObject<ValueType extends NullableNestedModelDefinition> {
  public getValue: NullableNestedGetter<ValueType>

  constructor(getter: NullableNestedGetter<ValueType>) {
    this.getValue = getter
  }
}

export type NullableGetter<ValueType extends ModelValueType> =
  () => ValueType | null

export class NullableProperty<ValueType extends ModelValueType> {
  public getValue: NullableGetter<ValueType>
  public isGetterFunctionReturningObject: boolean

  constructor(getter: NullableGetter<ValueType>) {
    this.getValue = getter
    this.isGetterFunctionReturningObject = isObject(getter)
  }
}

export function nullable<ValueType extends NullableNestedModelDefinition>(
  value: ValueType,
): NullableObject<ValueType>

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
    | Relation<any, any, any, { nullable: false }>
    | NullableNestedModelDefinition,
) {
  if (value instanceof Relation) {
    return new Relation({
      kind: value.kind,
      to: value.target.modelName,
      attributes: {
        ...value.attributes,
        nullable: true,
      },
    })
  }

  if (typeof value === 'object' || value === null) {
    return new NullableObject(() => value)
  }

  if (typeof value === 'function') {
    return new NullableProperty(value)
  }
}
