/**
 * Returns true if the given value is a plain Object.
 */
export function isObject(value: any): value is Record<string, any> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}
