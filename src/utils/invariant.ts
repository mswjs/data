export function invariant(
  value: any,
  message: string,
  error: Error = new Error(),
): asserts value {
  if (!value) {
    error.message = message
    throw error
  }
}
