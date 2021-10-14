/**
 * Returns true if the given value is a plain Object.
 */
export function isObject<O extends Record<string, any>>(
  value: any,
): value is O {
  return (
    value != null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  )
}
