export function getThrownError(fn: () => void) {
  try {
    fn()
  } catch (error) {
    return error
  }
}
