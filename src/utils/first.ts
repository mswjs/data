export function first<ArrayType extends any[]>(
  arr: ArrayType
): ArrayType extends Array<infer ValueType> ? ValueType : never {
  return arr?.length > 0 ? arr[0] : null
}
