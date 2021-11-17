import { PrimaryKeyType } from './glossary'

export type PrimaryKeyGetter<ValueType extends PrimaryKeyType> = () => ValueType

export class PrimaryKey<ValueType extends PrimaryKeyType = string> {
  public getPrimaryKeyValue: PrimaryKeyGetter<ValueType>

  constructor(getter: PrimaryKeyGetter<ValueType>) {
    this.getPrimaryKeyValue = getter
  }
}

export function primaryKey<ValueType extends PrimaryKeyType>(
  getter: PrimaryKeyGetter<ValueType>,
): PrimaryKey<ValueType> {
  return new PrimaryKey(getter)
}
