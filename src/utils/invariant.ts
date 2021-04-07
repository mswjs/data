export function invariant(
  value: any,
  message: string,
  error: Error = new Error(),
) {
  if (value) {
    error.message = message
    throw error
  }
}
