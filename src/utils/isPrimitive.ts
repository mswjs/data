/** Tests whether `value` is a primitive (string, number, boolean, date). */
export const isPrimitive = (value: any) =>
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean' ||
  value?.constructor.name === 'Date'
