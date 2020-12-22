type Exception = string | (() => Error)

export function invariant(value: boolean, expection: Exception) {
  if (value) {
    if (typeof expection === 'string') {
      throw new Error(expection)
    }
    throw expection()
  }
}
