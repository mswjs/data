import { ModelValueType, NestedModelDefinition } from './glossary'
import { ManyOf, OneOf, Relation, RelationKind } from './relations/Relation'

export class NullableObject<ValueType extends NestedModelDefinition> {
  public objectDefinition: ValueType
  public defaultsToNull: boolean

  constructor(definition: ValueType, defaultsToNull: boolean) {
    this.objectDefinition = definition
    this.defaultsToNull = defaultsToNull
  }
}

export type NullableGetter<ValueType extends ModelValueType> =
  () => ValueType | null

export class NullableProperty<ValueType extends ModelValueType> {
  public getValue: NullableGetter<ValueType>

  constructor(getter: NullableGetter<ValueType>) {
    this.getValue = getter
  }
}

export function nullable<ValueType extends NestedModelDefinition>(
  value: ValueType,
  options?: { defaultsToNull?: boolean },
): NullableObject<ValueType>

export function nullable<ValueType extends ModelValueType>(
  value: NullableGetter<ValueType>,
  options?: { defaultsToNull?: boolean },
): NullableProperty<ValueType>

export function nullable<
  ValueType extends Relation<any, any, any, { nullable: false }>,
>(
  value: ValueType,
  options?: { defaultsToNull?: boolean },
): ValueType extends Relation<infer Kind, infer Key, any, { nullable: false }>
  ? Kind extends RelationKind.ManyOf
    ? ManyOf<Key, true>
    : OneOf<Key, true>
  : never

export function nullable(
  value:
    | NullableGetter<ModelValueType>
    | Relation<any, any, any, { nullable: false }>
    | NestedModelDefinition,
  options?: { defaultsToNull?: boolean },
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

  if (typeof value === 'object') {
    return new NullableObject(value, !!options?.defaultsToNull)
  }

  if (typeof value === 'function') {
    return new NullableProperty(value)
  }
}
