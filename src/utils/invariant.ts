export function invariant(value: boolean, message: string) {
  if (value) {
    throw new Error(message)
  }
}
