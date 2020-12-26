export function invariant(
  value: boolean,
  message: string,
  error: Error = new Error(),
) {
  if (value) {
    error.message = message
    throw error
  }
}
