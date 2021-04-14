/**
 * Return the first element in the given array.
 */
export function first<ArrayType extends any[]>(
  arr: ArrayType,
): ArrayType extends Array<infer ValueType> ? ValueType | null : never {
  return arr != null && arr.length > 0 ? arr[0] : null
}
